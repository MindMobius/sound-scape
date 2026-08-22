import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_soloud/flutter_soloud.dart';

import '../data/bundled_sound_library.dart';
import '../data/local_sound_asset_importer.dart';
import '../data/local_soundscape_state_store.dart';
import '../data/sound_asset_importer.dart';
import '../data/soundscape_state_store.dart';
import '../domain/scene_recipe.dart';
import '../domain/sound_asset.dart';
import '../domain/soundscape_catalog.dart';
import '../domain/soundscape_scene.dart';
import '../domain/soundscape_user_state.dart';
import 'soundscape_mix.dart';
import 'soundscape_scheduler.dart';

enum SoundscapePhase { initializing, ready, playing, paused, stopped, failed }

@immutable
class SoundscapeSnapshot {
  const SoundscapeSnapshot({
    required this.phase,
    required this.scene,
    required this.masterVolume,
    required this.intensity,
    required this.richness,
    required this.layers,
    this.favoriteSceneIds = const {},
    this.savedPresets = const [],
    this.soundAssets = const [],
    this.importedSounds = const [],
    this.addedSoundAssetIds = const [],
    this.sleepTimerRemaining,
    this.error,
  });

  final SoundscapePhase phase;
  final SoundscapeScene scene;
  final double masterVolume;
  final double intensity;
  final double richness;
  final List<SoundLayerSnapshot> layers;
  final Set<String> favoriteSceneIds;
  final List<SavedSoundscapePreset> savedPresets;
  final List<SoundAsset> soundAssets;
  final List<ImportedSoundRecord> importedSounds;
  final List<String> addedSoundAssetIds;
  final Duration? sleepTimerRemaining;
  final String? error;

  bool get isPlaying => phase == SoundscapePhase.playing;
  bool get isReady =>
      phase != SoundscapePhase.initializing && phase != SoundscapePhase.failed;
  int get activeLayerCount => layers.where((layer) => layer.enabled).length;

  bool containsSoundAsset(String assetId) {
    return scene.layers.any((layer) => layer.assetId == assetId) ||
        addedSoundAssetIds.contains(assetId);
  }

  String? get selectedPresetId {
    for (final preset in SoundscapeCatalog.presets) {
      if ((preset.intensity - intensity).abs() < 0.025 &&
          (preset.richness - richness).abs() < 0.025) {
        return preset.id;
      }
    }
    return null;
  }
}

class SoundscapeRuntime {
  SoundscapeRuntime({
    BundledSoundLibrary? soundLibrary,
    SoundscapeStateStore? stateStore,
    SoundAssetImporter? soundAssetImporter,
  }) : _soundLibrary = soundLibrary ?? BundledSoundLibrary(),
       _stateStore = stateStore ?? LocalSoundscapeStateStore(),
       _soundAssetImporter = soundAssetImporter ?? LocalSoundAssetImporter();

  final SoLoud _soloud = SoLoud.instance;
  final BundledSoundLibrary _soundLibrary;
  final SoundscapeStateStore _stateStore;
  final SoundAssetImporter _soundAssetImporter;
  final StreamController<SoundscapeSnapshot> _stateController =
      StreamController<SoundscapeSnapshot>.broadcast();
  final Map<String, AudioSource> _sources = {};
  final Map<String, SoundHandle> _loopHandles = {};
  final Map<SoundLayerKind, Bus> _buses = {};
  final List<SoundHandle> _eventHandles = [];
  final Map<String, Map<String, double>> _presenceByScene = {};
  final Map<String, Set<String>> _disabledByScene = {};
  final Map<String, double> _intensityByScene = {};
  final Map<String, double> _richnessByScene = {};
  final Map<String, List<String>> _addedAssetsByScene = {};
  final Map<String, Map<String, SoundCharacter>> _charactersByScene = {};
  final Set<String> _favoriteSceneIds = {};
  final List<SavedSoundscapePreset> _savedPresets = [];
  final List<ImportedSoundRecord> _importedSounds = [];
  final Map<String, Timer> _textureTimers = {};
  final Map<String, Timer> _eventTimers = {};

  Future<void>? _initialization;
  Timer? _stateSaveTimer;
  SoundLibrary? _library;
  late SoundscapeScheduler _scheduler;
  SoundscapeScene _scene = SoundscapeCatalog.initialScene;
  SoundscapePhase _phase = SoundscapePhase.initializing;
  double _masterVolume = 0.52;
  Duration? _sleepTimerRemaining;
  bool _voicesReady = false;
  bool _ducked = false;
  String? _error;

  Stream<SoundscapeSnapshot> get states => _stateController.stream;

  SoundscapeSnapshot get current {
    final runtimeScene = _runtimeScene;
    final mix = _mix;
    final presence = _currentPresence;
    final disabled = _currentDisabled;
    return SoundscapeSnapshot(
      phase: _phase,
      scene: _scene,
      masterVolume: _masterVolume,
      intensity: _intensity,
      richness: _richness,
      sleepTimerRemaining: _sleepTimerRemaining,
      layers: List.unmodifiable(
        runtimeScene.layers.map(
          (definition) => SoundLayerSnapshot(
            definition: definition,
            enabled: !disabled.contains(definition.id),
            presence: presence[definition.id] ?? 1,
            effectiveGain: mix.gainFor(definition.id),
            character:
                _currentCharacters[definition.id] ?? SoundCharacter.natural,
            userAdded: definition.id.startsWith('library:'),
          ),
        ),
      ),
      favoriteSceneIds: Set.unmodifiable(_favoriteSceneIds),
      savedPresets: List.unmodifiable(_savedPresets),
      soundAssets: List.unmodifiable(_allAssets),
      importedSounds: List.unmodifiable(_importedSounds),
      addedSoundAssetIds: List.unmodifiable(_currentAddedAssets),
      error: _error,
    );
  }

  double get _intensity =>
      _intensityByScene.putIfAbsent(_scene.id, () => _scene.defaultIntensity);

  double get _richness =>
      _richnessByScene.putIfAbsent(_scene.id, () => _scene.defaultRichness);

  Map<String, double> get _currentPresence =>
      _presenceByScene.putIfAbsent(_scene.id, () => {});

  Set<String> get _currentDisabled => _disabledByScene.putIfAbsent(
    _scene.id,
    () => {
      for (final layer in _runtimeScene.layers)
        if (!layer.enabledByDefault) layer.id,
    },
  );

  List<String> get _currentAddedAssets =>
      _addedAssetsByScene.putIfAbsent(_scene.id, () => []);

  Map<String, SoundCharacter> get _currentCharacters =>
      _charactersByScene.putIfAbsent(_scene.id, () => {});

  List<SoundAsset> get _allAssets => [
    ...?_library?.assets,
    for (final sound in _importedSounds) sound.asset,
  ];

  SoundAsset? _tryAssetById(String assetId) {
    for (final asset in _allAssets) {
      if (asset.id == assetId) return asset;
    }
    return null;
  }

  SoundAsset _assetById(String assetId) {
    final asset = _tryAssetById(assetId);
    if (asset == null) {
      throw StateError('Sound asset $assetId is not available.');
    }
    return asset;
  }

  SoundLibrary get _effectiveLibrary {
    final library = _library;
    if (library == null) throw StateError('Sound library is not initialized.');
    return SoundLibrary(
      schemaVersion: library.schemaVersion,
      catalogVersion: library.catalogVersion,
      updatedAt: library.updatedAt,
      assets: _allAssets,
    );
  }

  SoundscapeScene get _runtimeScene => _runtimeSceneFor(_scene);

  SoundscapeScene _runtimeSceneFor(SoundscapeScene scene) {
    final baseAssetIds = scene.layers.map((layer) => layer.assetId).toSet();
    final addedLayers = <SoundLayerDefinition>[];
    for (final assetId in _addedAssetsByScene[scene.id] ?? const <String>[]) {
      final asset = _tryAssetById(assetId);
      if (asset == null || baseAssetIds.contains(assetId)) continue;
      addedLayers.add(_layerForAsset(asset));
    }
    return SoundscapeScene(
      schemaVersion: scene.schemaVersion,
      seed: scene.seed,
      id: scene.id,
      name: scene.name,
      description: scene.description,
      coverAsset: scene.coverAsset,
      heroAsset: scene.heroAsset,
      layers: [...scene.layers, ...addedLayers],
      defaultIntensity: scene.defaultIntensity,
      defaultRichness: scene.defaultRichness,
    );
  }

  SoundLayerDefinition _layerForAsset(SoundAsset asset) {
    final eventSegments = asset.segments
        .where((segment) => segment.purpose == SoundSegmentPurpose.event)
        .toList();
    final continuousSegments = asset.segments
        .where(
          (segment) =>
              segment.purpose == SoundSegmentPurpose.loop ||
              segment.purpose == SoundSegmentPurpose.texture,
        )
        .toList();
    final eventOnly = eventSegments.isNotEmpty && continuousSegments.isEmpty;
    final segments = eventOnly
        ? eventSegments
        : continuousSegments.isNotEmpty
        ? [continuousSegments.first]
        : [asset.segmentById(asset.previewSegmentId)];
    return SoundLayerDefinition(
      id: 'library:${asset.id}',
      name: asset.name.resolve(),
      assetId: asset.id,
      segmentIds: [for (final segment in segments) segment.id],
      kind: eventOnly ? SoundLayerKind.event : SoundLayerKind.texture,
      baseGain: eventOnly ? 0.04 : 0.12,
      intensityGain: eventOnly ? 0.06 : 0.12,
      richnessGain: eventOnly ? 0.14 : 0.08,
      eventPolicy: eventOnly
          ? const SoundEventPolicy(
              minimumSilence: Duration(seconds: 9),
              maximumSilence: Duration(seconds: 22),
            )
          : const SoundEventPolicy(),
      dynamics: const SoundLayerDynamics(
        gainVariation: 0.11,
        panVariation: 0.24,
        minimumChangeInterval: Duration(seconds: 7),
        maximumChangeInterval: Duration(seconds: 14),
        minimumTransition: Duration(seconds: 5),
        maximumTransition: Duration(seconds: 10),
      ),
    );
  }

  SoundLayerDefinition? _layerById(String layerId) {
    for (final layer in _runtimeScene.layers) {
      if (layer.id == layerId) return layer;
    }
    return null;
  }

  SoundscapeMix get _mix => SoundscapeMix.fromScene(
    scene: _runtimeScene,
    intensity: _intensity,
    richness: _richness,
    presence: _currentPresence,
    disabledLayers: _currentDisabled,
  );

  Future<void> initialize() => _initialization ??= _initialize();

  Future<void> _initialize() async {
    try {
      final library = await _soundLibrary.load();
      _library = library;
      final libraryIssues = library.integrityIssues(
        scenes: SoundscapeCatalog.scenes,
      );
      final releaseIssues = library.releaseIssues(
        library.assets.map((asset) => asset.id),
      );
      final recipeIssues = [
        for (final scene in SoundscapeCatalog.scenes)
          ...SceneRecipe.fromScene(scene).validationIssues(),
      ];
      if (libraryIssues.isNotEmpty ||
          releaseIssues.isNotEmpty ||
          recipeIssues.isNotEmpty) {
        throw StateError(
          [
            ...libraryIssues.map((issue) => issue.message),
            ...releaseIssues.map((issue) => issue.message),
            ...recipeIssues,
          ].join('\n'),
        );
      }
      await _restoreState();
      _scheduler = SoundscapeScheduler(
        scene: _runtimeScene,
        library: _effectiveLibrary,
      );

      if (!_soloud.isInitialized) await _soloud.init();

      _soloud.setGlobalVolume(_effectiveMasterVolume);
      _phase = SoundscapePhase.ready;
      _emit();
    } catch (error, stackTrace) {
      debugPrint(
        'Soundscape runtime initialization failed: $error\n$stackTrace',
      );
      _error = error.toString();
      _phase = SoundscapePhase.failed;
      _emit();
      rethrow;
    }
  }

  Future<void> play() async {
    await initialize();
    if (_phase == SoundscapePhase.failed || _phase == SoundscapePhase.playing) {
      return;
    }

    await _ensureVoices();
    _soloud.setGlobalVolume(0);
    _setVoicesPaused(false);
    _setBusesPaused(false);
    _soloud.fadeGlobalVolume(
      _effectiveMasterVolume,
      const Duration(milliseconds: 620),
    );
    _phase = SoundscapePhase.playing;
    _startDynamics();
    _emit();
  }

  Future<void> pause() async {
    if (_phase != SoundscapePhase.playing) return;

    _stopDynamics();
    _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 420));
    await Future<void>.delayed(const Duration(milliseconds: 440));
    await _stopEventVoices();
    _setVoicesPaused(true);
    _setBusesPaused(true);
    _soloud.setGlobalVolume(_effectiveMasterVolume);
    _phase = SoundscapePhase.paused;
    _emit();
  }

  Future<void> stop() async {
    _stopDynamics();
    if (_soloud.isInitialized && _phase == SoundscapePhase.playing) {
      _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 320));
      await Future<void>.delayed(const Duration(milliseconds: 340));
    }
    await _clearVoices();
    if (_soloud.isInitialized) _soloud.setGlobalVolume(_effectiveMasterVolume);
    _phase = SoundscapePhase.stopped;
    _emit();
  }

  Future<void> selectScene(
    SoundscapeScene scene, {
    bool autoplay = true,
  }) async {
    await initialize();
    if (scene.id == _scene.id) {
      if (autoplay && !current.isPlaying) await play();
      return;
    }

    final shouldPlay = autoplay || _phase == SoundscapePhase.playing;
    _stopDynamics();
    if (_voicesReady && _phase == SoundscapePhase.playing) {
      _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 420));
      await Future<void>.delayed(const Duration(milliseconds: 440));
    }
    await _clearVoices();

    _scene = scene;
    _scheduler = SoundscapeScheduler(
      scene: _runtimeScene,
      library: _effectiveLibrary,
    );
    _error = null;
    _phase = shouldPlay ? SoundscapePhase.ready : SoundscapePhase.paused;
    _scheduleStateSave();
    _emit();

    if (shouldPlay) await play();
  }

  void setMasterVolume(double value) {
    _masterVolume = value.clamp(0.0, 1.0);
    if (_soloud.isInitialized) {
      _soloud.fadeGlobalVolume(
        _effectiveMasterVolume,
        const Duration(milliseconds: 220),
      );
    }
    _scheduleStateSave();
    _emit();
  }

  void setIntensity(double value) {
    _intensityByScene[_scene.id] = value.clamp(0.0, 1.0);
    _applyMix();
    _scheduleStateSave();
    _emit();
  }

  void setRichness(double value) {
    _richnessByScene[_scene.id] = value.clamp(0.0, 1.0);
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _restartEventSchedule();
    }
    _scheduleStateSave();
    _emit();
  }

  void setLayerPresence(String layerId, double value) {
    if (!_runtimeScene.layers.any((layer) => layer.id == layerId)) return;
    _currentPresence[layerId] = value.clamp(0.0, 1.0);
    _applyMix();
    _scheduleStateSave();
    _emit();
  }

  void setLayerEnabled(String layerId, {required bool enabled}) {
    if (!_runtimeScene.layers.any((layer) => layer.id == layerId)) return;
    if (enabled) {
      _currentDisabled.remove(layerId);
    } else {
      _currentDisabled.add(layerId);
    }
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _restartEventSchedule();
    }
    _scheduleStateSave();
    _emit();
  }

  void setLayerCharacter(String layerId, SoundCharacter character) {
    final layer = _layerById(layerId);
    if (layer == null) return;
    _currentCharacters[layerId] = character;
    final handle = _loopHandles[layerId];
    if (handle != null && _isValid(handle)) {
      final segment = _assetById(layer.assetId)
          .segmentById(layer.segmentIds.first);
      final source = _sources[segment.path];
      if (source != null) _applySoundCharacter(source, handle, character);
    }
    _scheduleStateSave();
    _emit();
  }

  Future<void> addSoundAsset(String assetId) async {
    await initialize();
    final asset = _assetById(assetId);
    final alreadyInScene = _scene.layers.any(
      (layer) => layer.assetId == asset.id,
    );
    if (alreadyInScene || _currentAddedAssets.contains(asset.id)) return;
    _currentAddedAssets.add(asset.id);
    final layer = _layerForAsset(asset);
    _currentPresence[layer.id] = 0.72;
    _currentCharacters[layer.id] = SoundCharacter.natural;
    try {
      await _refreshVoicesAfterLayerChange();
    } catch (error, stackTrace) {
      _currentAddedAssets.remove(asset.id);
      _currentPresence.remove(layer.id);
      _currentCharacters.remove(layer.id);
      await _recoverVoicesAfterFailedLayerChange();
      Error.throwWithStackTrace(error, stackTrace);
    }
    _scheduleStateSave();
    _emit();
  }

  Future<void> removeSoundLayer(String layerId) async {
    await initialize();
    final layer = layerId.startsWith('library:') ? _layerById(layerId) : null;
    if (layer == null) return;
    final previousIndex = _currentAddedAssets.indexOf(layer.assetId);
    final hadPresence = _currentPresence.containsKey(layer.id);
    final previousPresence = _currentPresence[layer.id];
    final wasDisabled = _currentDisabled.contains(layer.id);
    final previousCharacter = _currentCharacters[layer.id];
    _currentAddedAssets.remove(layer.assetId);
    _currentPresence.remove(layer.id);
    _currentDisabled.remove(layer.id);
    _currentCharacters.remove(layer.id);
    try {
      await _refreshVoicesAfterLayerChange();
    } catch (error, stackTrace) {
      _currentAddedAssets.insert(previousIndex, layer.assetId);
      if (hadPresence) _currentPresence[layer.id] = previousPresence!;
      if (wasDisabled) _currentDisabled.add(layer.id);
      if (previousCharacter != null) {
        _currentCharacters[layer.id] = previousCharacter;
      }
      await _recoverVoicesAfterFailedLayerChange();
      Error.throwWithStackTrace(error, stackTrace);
    }
    _scheduleStateSave();
    _emit();
  }

  Future<SoundAsset?> importSound() async {
    await initialize();
    final imported = await _soundAssetImporter.pickAndImport();
    if (imported == null) return null;
    for (final existing in _importedSounds) {
      if (existing.asset.id == imported.asset.id) {
        if (existing.asset.segments.first.path !=
            imported.asset.segments.first.path) {
          await _soundAssetImporter.delete(imported.asset);
        }
        return existing.asset;
      }
    }
    _importedSounds.add(
      ImportedSoundRecord(
        asset: imported.asset,
        originalFileName: imported.originalFileName,
        byteLength: imported.byteLength,
        importedAt: DateTime.now().toUtc(),
      ),
    );
    _scheduleStateSave();
    _emit();
    return imported.asset;
  }

  void renameImportedSound(String assetId, String name) {
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) return;
    final index = _importedSounds.indexWhere(
      (sound) => sound.asset.id == assetId,
    );
    if (index < 0) return;
    final record = _importedSounds[index];
    _importedSounds[index] = record.copyWith(
      asset: record.asset.copyWith(
        name: SoundLocalizedText({'zh-CN': normalizedName}),
      ),
    );
    _scheduleStateSave();
    _emit();
  }

  Future<void> deleteImportedSound(String assetId) async {
    await initialize();
    final index = _importedSounds.indexWhere(
      (sound) => sound.asset.id == assetId,
    );
    if (index < 0) return;
    final record = _importedSounds[index];
    final addedAssetsBackup = {
      for (final entry in _addedAssetsByScene.entries)
        entry.key: List<String>.of(entry.value),
    };
    final presenceBackup = {
      for (final entry in _presenceByScene.entries)
        entry.key: Map<String, double>.of(entry.value),
    };
    final disabledBackup = {
      for (final entry in _disabledByScene.entries)
        entry.key: Set<String>.of(entry.value),
    };
    final charactersBackup = {
      for (final entry in _charactersByScene.entries)
        entry.key: Map<String, SoundCharacter>.of(entry.value),
    };
    final presetsBackup = List<SavedSoundscapePreset>.of(_savedPresets);
    _importedSounds.removeAt(index);
    final layerId = 'library:$assetId';
    for (final addedAssets in _addedAssetsByScene.values) {
      addedAssets.remove(assetId);
    }
    for (final presence in _presenceByScene.values) {
      presence.remove(layerId);
    }
    for (final disabled in _disabledByScene.values) {
      disabled.remove(layerId);
    }
    for (final characters in _charactersByScene.values) {
      characters.remove(layerId);
    }
    for (var index = 0; index < _savedPresets.length; index++) {
      final preset = _savedPresets[index];
      final addedAssets = [...preset.mix.addedAssetIds]..remove(assetId);
      final presence = Map.of(preset.mix.layerPresence)..remove(layerId);
      final disabled = Set.of(preset.mix.disabledLayerIds)..remove(layerId);
      final characters = Map.of(preset.mix.layerCharacters)..remove(layerId);
      _savedPresets[index] = preset.copyWith(
        mix: preset.mix.copyWith(
          addedAssetIds: addedAssets,
          layerPresence: presence,
          disabledLayerIds: disabled,
          layerCharacters: characters,
        ),
      );
    }
    try {
      await _refreshVoicesAfterLayerChange();
      await _soundAssetImporter.delete(record.asset);
    } catch (error, stackTrace) {
      final fileStillExists = await _soundAssetImporter.exists(record.asset);
      if (fileStillExists) {
        _importedSounds.insert(index, record);
        _restoreSceneMaps(
          addedAssets: addedAssetsBackup,
          presence: presenceBackup,
          disabled: disabledBackup,
          characters: charactersBackup,
        );
        _savedPresets
          ..clear()
          ..addAll(presetsBackup);
        await _recoverVoicesAfterFailedLayerChange();
        Error.throwWithStackTrace(error, stackTrace);
      }
      debugPrint(
        'Imported sound deletion completed with a cleanup error: '
        '$error\n$stackTrace',
      );
    }
    _scheduleStateSave();
    _emit();
  }

  void _restoreSceneMaps({
    required Map<String, List<String>> addedAssets,
    required Map<String, Map<String, double>> presence,
    required Map<String, Set<String>> disabled,
    required Map<String, Map<String, SoundCharacter>> characters,
  }) {
    _addedAssetsByScene
      ..clear()
      ..addAll(addedAssets);
    _presenceByScene
      ..clear()
      ..addAll(presence);
    _disabledByScene
      ..clear()
      ..addAll(disabled);
    _charactersByScene
      ..clear()
      ..addAll(characters);
  }

  void applyPreset(ListeningPreset preset) {
    _intensityByScene[_scene.id] = preset.intensity.clamp(0.0, 1.0);
    _richnessByScene[_scene.id] = preset.richness.clamp(0.0, 1.0);
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _restartEventSchedule();
    }
    _scheduleStateSave();
    _emit();
  }

  void setSceneFavorite(String sceneId, {required bool favorite}) {
    if (!SoundscapeCatalog.scenes.any((scene) => scene.id == sceneId)) return;
    if (favorite) {
      _favoriteSceneIds.add(sceneId);
    } else {
      _favoriteSceneIds.remove(sceneId);
    }
    _scheduleStateSave();
    _emit();
  }

  void saveCurrentAsPreset({required String id, required String name}) {
    if (id.trim().isEmpty || name.trim().isEmpty) return;
    final preset = SavedSoundscapePreset(
      id: id,
      name: name.trim(),
      sceneId: _scene.id,
      createdAt: DateTime.now().toUtc(),
      mix: SceneMixState(
        intensity: _intensity,
        richness: _richness,
        layerPresence: _currentPresence,
        disabledLayerIds: _currentDisabled,
        addedAssetIds: _currentAddedAssets,
        layerCharacters: _currentCharacters,
      ),
    );
    _savedPresets.removeWhere((item) => item.id == id);
    _savedPresets.add(preset);
    _scheduleStateSave();
    _emit();
  }

  void deleteSavedPreset(String presetId) {
    final previousLength = _savedPresets.length;
    _savedPresets.removeWhere((preset) => preset.id == presetId);
    if (_savedPresets.length == previousLength) return;
    _scheduleStateSave();
    _emit();
  }

  void renameSavedPreset(String presetId, String name) {
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) return;
    final index = _savedPresets.indexWhere((preset) => preset.id == presetId);
    if (index < 0) return;
    _savedPresets[index] = _savedPresets[index].copyWith(name: normalizedName);
    _scheduleStateSave();
    _emit();
  }

  Future<void> applySavedPreset(String presetId) async {
    SavedSoundscapePreset? preset;
    for (final candidate in _savedPresets) {
      if (candidate.id == presetId) {
        preset = candidate;
        break;
      }
    }
    if (preset == null) return;
    final shouldPlay = _phase == SoundscapePhase.playing;
    await selectScene(
      SoundscapeCatalog.byId(preset.sceneId),
      autoplay: shouldPlay,
    );
    _intensityByScene[_scene.id] = preset.mix.intensity.clamp(0.0, 1.0);
    _richnessByScene[_scene.id] = preset.mix.richness.clamp(0.0, 1.0);
    _presenceByScene[_scene.id] = Map.of(preset.mix.layerPresence);
    _disabledByScene[_scene.id] = Set.of(preset.mix.disabledLayerIds);
    _addedAssetsByScene[_scene.id] = [
      for (final assetId in preset.mix.addedAssetIds)
        if (_tryAssetById(assetId) != null) assetId,
    ];
    _charactersByScene[_scene.id] = Map.of(preset.mix.layerCharacters);
    await _refreshVoicesAfterLayerChange();
    _applyMix();
    if (_phase == SoundscapePhase.playing) _restartEventSchedule();
    _scheduleStateSave();
    _emit();
  }

  void setSleepTimerRemaining(Duration? remaining) {
    _sleepTimerRemaining = remaining;
    _emit();
  }

  void setDucked(bool value) {
    _ducked = value;
    if (_soloud.isInitialized) {
      _soloud.fadeGlobalVolume(
        _effectiveMasterVolume,
        const Duration(milliseconds: 280),
      );
    }
  }

  Future<void> shutdown() async {
    _stateSaveTimer?.cancel();
    await _saveState();
    await stop();
    await _stateController.close();
    if (_soloud.isInitialized) await _soloud.deinitAsync();
  }

  double get _effectiveMasterVolume => _masterVolume * (_ducked ? 0.22 : 1);

  Future<void> _restoreState() async {
    try {
      final state = await _stateStore.load();
      if (state == null) return;
      _importedSounds.clear();
      for (final sound in state.importedSounds) {
        if (await _soundAssetImporter.exists(sound.asset)) {
          _importedSounds.add(sound);
        }
      }
      _scene = SoundscapeCatalog.scenes.firstWhere(
        (scene) => scene.id == state.selectedSceneId,
        orElse: () => SoundscapeCatalog.initialScene,
      );
      _masterVolume = state.masterVolume.clamp(0.0, 1.0);
      _favoriteSceneIds
        ..clear()
        ..addAll(
          state.favoriteSceneIds.where(
            (sceneId) =>
                SoundscapeCatalog.scenes.any((scene) => scene.id == sceneId),
          ),
        );
      _savedPresets
        ..clear()
        ..addAll(
          state.savedPresets.where(
            (preset) => SoundscapeCatalog.scenes.any(
              (scene) => scene.id == preset.sceneId,
            ),
          ),
        );
      for (final scene in SoundscapeCatalog.scenes) {
        final sceneState = state.scenes[scene.id];
        if (sceneState == null) continue;
        _addedAssetsByScene[scene.id] = [
          for (final assetId in sceneState.addedAssetIds)
            if (_tryAssetById(assetId) != null &&
                !scene.layers.any((layer) => layer.assetId == assetId))
              assetId,
        ];
        final layerIds = _runtimeSceneFor(scene).layers
            .map((layer) => layer.id)
            .toSet();
        _intensityByScene[scene.id] = sceneState.intensity.clamp(0.0, 1.0);
        _richnessByScene[scene.id] = sceneState.richness.clamp(0.0, 1.0);
        _presenceByScene[scene.id] = {
          for (final entry in sceneState.layerPresence.entries)
            if (layerIds.contains(entry.key))
              entry.key: entry.value.clamp(0.0, 1.0),
        };
        _disabledByScene[scene.id] = {
          ...sceneState.disabledLayerIds.where(layerIds.contains),
        };
        _charactersByScene[scene.id] = {
          for (final entry in sceneState.layerCharacters.entries)
            if (layerIds.contains(entry.key)) entry.key: entry.value,
        };
      }
    } catch (error, stackTrace) {
      debugPrint('Soundscape state restore failed: $error\n$stackTrace');
    }
  }

  void _scheduleStateSave() {
    _stateSaveTimer?.cancel();
    _stateSaveTimer = Timer(const Duration(milliseconds: 280), () {
      unawaited(_saveState());
    });
  }

  Future<void> _saveState() async {
    try {
      await _stateStore.save(
        SoundscapeUserState(
          schemaVersion: SoundscapeUserState.currentSchemaVersion,
          selectedSceneId: _scene.id,
          masterVolume: _masterVolume,
          scenes: {
            for (final scene in SoundscapeCatalog.scenes)
              scene.id: SceneMixState(
                intensity:
                    _intensityByScene[scene.id] ?? scene.defaultIntensity,
                richness: _richnessByScene[scene.id] ?? scene.defaultRichness,
                layerPresence: _presenceByScene[scene.id] ?? const {},
                disabledLayerIds:
                    _disabledByScene[scene.id] ??
                    {
                      for (final layer in scene.layers)
                        if (!layer.enabledByDefault) layer.id,
                    },
                addedAssetIds: _addedAssetsByScene[scene.id] ?? const [],
                layerCharacters: _charactersByScene[scene.id] ?? const {},
              ),
          },
          favoriteSceneIds: _favoriteSceneIds,
          savedPresets: _savedPresets,
          importedSounds: _importedSounds,
        ),
      );
    } catch (error, stackTrace) {
      debugPrint('Soundscape state save failed: $error\n$stackTrace');
    }
  }

  Future<AudioSource> _loadSource(String path) async {
    final cached = _sources[path];
    if (cached != null) return cached;
    final source = path.startsWith('assets/')
        ? await _soloud.loadAsset(path, mode: LoadMode.disk)
        : await _soloud.loadFile(path, mode: LoadMode.disk);
    _sources[path] = source;
    _prepareSoundFilters(source);
    return source;
  }

  void _prepareSoundFilters(AudioSource source) {
    if (kIsWeb) return;
    try {
      final filters = [
        source.filters.biquadFilter,
        source.filters.lofiFilter,
        source.filters.bassBoostFilter,
        source.filters.waveShaperFilter,
        source.filters.echoFilter,
      ];
      for (final filter in filters) {
        if (!filter.isActive) filter.activate();
      }
    } catch (error, stackTrace) {
      debugPrint('Sound filter preparation failed: $error\n$stackTrace');
    }
  }

  void _applySoundCharacter(
    AudioSource source,
    SoundHandle handle,
    SoundCharacter character,
  ) {
    if (kIsWeb) return;
    final profile = _characterProfile(character);
    try {
      final biquad = source.filters.biquadFilter;
      biquad.wet(soundHandle: handle).value = profile.biquadWet;
      biquad.type(soundHandle: handle).value = profile.biquadType;
      biquad.frequency(soundHandle: handle).value = profile.frequency;
      biquad.resonance(soundHandle: handle).value = profile.resonance;

      final lofi = source.filters.lofiFilter;
      lofi.wet(soundHandle: handle).value = profile.lofiWet;
      lofi.samplerate(soundHandle: handle).value = profile.sampleRate;
      lofi.bitdepth(soundHandle: handle).value = profile.bitDepth;

      final bass = source.filters.bassBoostFilter;
      bass.wet(soundHandle: handle).value = profile.bassWet;
      bass.boost(soundHandle: handle).value = profile.bassBoost;

      final saturation = source.filters.waveShaperFilter;
      saturation.wet(soundHandle: handle).value = profile.saturationWet;
      saturation.amount(soundHandle: handle).value = profile.saturation;

      final echo = source.filters.echoFilter;
      echo.wet(soundHandle: handle).value = profile.echoWet;
      echo.delay(soundHandle: handle).value = profile.echoDelay;
      echo.decay(soundHandle: handle).value = profile.echoDecay;
      echo.filter(soundHandle: handle).value = profile.echoFilter;
    } catch (error, stackTrace) {
      debugPrint('Sound character application failed: $error\n$stackTrace');
    }
  }

  Future<void> _ensureVoices() async {
    if (_voicesReady) return;

    final runtimeScene = _runtimeScene;
    for (final layer in runtimeScene.layers) {
      final asset = _assetById(layer.assetId);
      for (final segmentId in layer.segmentIds) {
        await _loadSource(asset.segmentById(segmentId).path);
      }
    }

    _buses[SoundLayerKind.bed] = _soloud.createMixingBus(name: 'environment')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.texture] = _soloud.createMixingBus(name: 'texture')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.event] = _soloud.createMixingBus(name: 'events')
      ..playOnEngine(paused: true);

    final mix = _mix;
    for (final layer in runtimeScene.layers) {
      if (layer.kind == SoundLayerKind.event) continue;
      final segment = _assetById(layer.assetId)
          .segmentById(layer.segmentIds.first);
      final source = _sources[segment.path];
      final bus = _buses[layer.kind];
      if (source == null || bus == null) {
        throw StateError('Sound source is not loaded: ${segment.path}');
      }
      final handle = bus.play(
        source,
        volume: mix.gainFor(layer.id),
        pan: layer.pan,
        paused: true,
        looping: true,
        loopingStartAt: segment.start,
      );
      _loopHandles[layer.id] = handle;
      _applySoundCharacter(
        source,
        handle,
        _currentCharacters[layer.id] ?? SoundCharacter.natural,
      );
      if (segment.start > Duration.zero) {
        _soloud.seek(handle, segment.start);
      }
    }

    _voicesReady = true;
    _emit();
  }

  void _applyMix() {
    if (!_voicesReady || !_soloud.isInitialized) return;
    final mix = _mix;
    for (final layer in _runtimeScene.layers) {
      final handle = _loopHandles[layer.id];
      if (handle != null && _isValid(handle)) {
        _soloud.fadeVolume(
          handle,
          mix.gainFor(layer.id),
          const Duration(milliseconds: 720),
        );
      }
    }
  }

  void _setVoicesPaused(bool paused) {
    for (final handle in _loopHandles.values) {
      if (_isValid(handle)) _soloud.setPause(handle, paused);
    }
  }

  void _setBusesPaused(bool paused) {
    for (final bus in _buses.values) {
      final handle = bus.soundHandle;
      if (handle != null && _isValid(handle)) _soloud.setPause(handle, paused);
    }
  }

  Future<void> _clearVoices() async {
    await _stopEventVoices();
    for (final handle in _loopHandles.values) {
      if (_isValid(handle)) await _soloud.stop(handle);
    }
    for (final bus in _buses.values) {
      final handle = bus.soundHandle;
      if (handle != null && _isValid(handle)) await _soloud.stop(handle);
      if (bus.isActive) bus.dispose();
    }
    _loopHandles.clear();
    _buses.clear();
    _voicesReady = false;
  }

  Future<void> _refreshVoicesAfterLayerChange() async {
    _scheduler = SoundscapeScheduler(
      scene: _runtimeScene,
      library: _effectiveLibrary,
    );
    final wasPlaying = _phase == SoundscapePhase.playing;
    if (!_voicesReady && !wasPlaying) return;
    _stopDynamics();
    if (_voicesReady && wasPlaying) {
      _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 260));
      await Future<void>.delayed(const Duration(milliseconds: 280));
    }
    await _clearVoices();
    if (!wasPlaying) return;
    await _ensureVoices();
    _setVoicesPaused(false);
    _setBusesPaused(false);
    _soloud.fadeGlobalVolume(
      _effectiveMasterVolume,
      const Duration(milliseconds: 420),
    );
    _startDynamics();
  }

  Future<void> _recoverVoicesAfterFailedLayerChange() async {
    try {
      await _refreshVoicesAfterLayerChange();
    } catch (error, stackTrace) {
      debugPrint('Soundscape voice recovery failed: $error\n$stackTrace');
    }
  }

  void _startDynamics() {
    _stopDynamics();
    for (final layer in _runtimeScene.layers) {
      switch (layer.kind) {
        case SoundLayerKind.texture:
          _scheduleNextTextureChange(layer);
        case SoundLayerKind.event:
          _scheduleNextEvent(layer);
        case SoundLayerKind.bed:
          break;
      }
    }
  }

  void _stopDynamics() {
    for (final timer in _textureTimers.values) {
      timer.cancel();
    }
    for (final timer in _eventTimers.values) {
      timer.cancel();
    }
    _textureTimers.clear();
    _eventTimers.clear();
  }

  void _scheduleNextTextureChange(SoundLayerDefinition layer) {
    if (_phase != SoundscapePhase.playing) return;
    final plan = _scheduler.nextTextureChange(layer);
    _textureTimers[layer.id] = Timer(plan.delay, () {
      if (_phase != SoundscapePhase.playing) return;
      final handle = _loopHandles[layer.id];
      if (handle != null && _isValid(handle)) {
        _soloud.fadeVolume(
          handle,
          (_mix.gainFor(layer.id) * plan.gainScale).clamp(0.0, 1.0),
          plan.transition,
        );
        _soloud.fadePan(handle, plan.pan, plan.transition);
      }
      _scheduleNextTextureChange(layer);
    });
  }

  void _scheduleNextEvent(SoundLayerDefinition layer) {
    if (_phase != SoundscapePhase.playing) return;
    final mix = _mix;
    if (mix.gainFor(layer.id) <= 0.001) return;
    final plan = _scheduler.nextEvent(layer: layer, density: mix.eventDensity);
    _eventTimers[layer.id] = Timer(plan.delay, () {
      if (_phase != SoundscapePhase.playing) return;
      if (_mix.gainFor(layer.id) <= 0.001) return;
      final eventBus = _buses[SoundLayerKind.event];
      if (eventBus != null) {
        _playEventPlan(layer, plan, eventBus);
      }
      _scheduleNextEvent(layer);
    });
  }

  void _playEventPlan(
    SoundLayerDefinition layer,
    ScheduledSoundEvent plan,
    Bus eventBus,
  ) {
    var engineTime = _soloud.getEngineTime() + layer.eventPolicy.scheduleLead;
    final bridge = plan.bridgeSegment;
    if (bridge != null && bridge.duration != null) {
      final bridgeHandle = _playScheduledSegment(
        eventBus: eventBus,
        segment: bridge,
        atTime: engineTime,
        duration: bridge.duration!,
        volume: (_mix.gainFor(layer.id) * plan.gainScale * 0.72).clamp(
          0.0,
          1.0,
        ),
        pan: plan.pan,
      );
      if (bridgeHandle != null) _eventHandles.add(bridgeHandle);
      if (bridgeHandle != null) {
        final source = _sources[bridge.path];
        if (source != null) {
          _applySoundCharacter(
            source,
            bridgeHandle,
            _currentCharacters[layer.id] ?? SoundCharacter.natural,
          );
        }
      }
      engineTime += bridge.duration!;
    }
    final handle = _playScheduledSegment(
      eventBus: eventBus,
      segment: plan.segment,
      atTime: engineTime,
      duration: plan.duration,
      volume: (_mix.gainFor(layer.id) * plan.gainScale).clamp(0.0, 1.0),
      pan: plan.pan,
    );
    _eventHandles.removeWhere((item) => !_isValid(item));
    if (handle != null) {
      final source = _sources[plan.segment.path];
      if (source != null) {
        _applySoundCharacter(
          source,
          handle,
          _currentCharacters[layer.id] ?? SoundCharacter.natural,
        );
      }
      _eventHandles.add(handle);
    }
  }

  SoundHandle? _playScheduledSegment({
    required Bus eventBus,
    required SoundSegment segment,
    required Duration atTime,
    required Duration duration,
    required double volume,
    required double pan,
  }) {
    final source = _sources[segment.path];
    if (source == null) return null;
    final handle = eventBus.playScheduled(
      source,
      atTime,
      duration: duration,
      volume: volume,
      pan: pan,
    );
    if (segment.start > Duration.zero) _soloud.seek(handle, segment.start);
    return handle;
  }

  void _restartEventSchedule() {
    for (final timer in _eventTimers.values) {
      timer.cancel();
    }
    _eventTimers.clear();
    for (final layer in _runtimeScene.layers.where(
      (layer) => layer.kind == SoundLayerKind.event,
    )) {
      _scheduleNextEvent(layer);
    }
  }

  Future<void> _stopEventVoices() async {
    for (final handle in _eventHandles) {
      if (_isValid(handle)) await _soloud.stop(handle);
    }
    _eventHandles.clear();
  }

  bool _isValid(SoundHandle handle) =>
      _soloud.isInitialized && _soloud.getIsValidVoiceHandle(handle);

  void _emit() {
    if (!_stateController.isClosed) _stateController.add(current);
  }
}

_SoundCharacterProfile _characterProfile(SoundCharacter character) {
  return switch (character) {
    SoundCharacter.natural => const _SoundCharacterProfile(),
    SoundCharacter.hifi => const _SoundCharacterProfile(
      bassWet: 0.12,
      bassBoost: 1.4,
      saturationWet: 0.025,
      saturation: 0.04,
    ),
    SoundCharacter.tube => const _SoundCharacterProfile(
      biquadWet: 0.12,
      frequency: 13000,
      resonance: 0.28,
      lofiWet: 0.03,
      sampleRate: 18000,
      bitDepth: 14,
      bassWet: 0.18,
      bassBoost: 1.1,
      saturationWet: 0.16,
      saturation: 0.16,
    ),
    SoundCharacter.radio => const _SoundCharacterProfile(
      biquadWet: 0.86,
      biquadType: 2,
      frequency: 2200,
      resonance: 0.8,
      lofiWet: 0.38,
      sampleRate: 9000,
      bitDepth: 8,
      saturationWet: 0.14,
      saturation: 0.18,
      echoWet: 0.025,
      echoDelay: 0.055,
      echoDecay: 0.08,
    ),
    SoundCharacter.television => const _SoundCharacterProfile(
      biquadWet: 0.72,
      biquadType: 2,
      frequency: 3200,
      resonance: 0.62,
      lofiWet: 0.52,
      sampleRate: 12000,
      bitDepth: 7,
      saturationWet: 0.12,
      saturation: 0.14,
      echoWet: 0.015,
      echoDelay: 0.04,
      echoDecay: 0.06,
    ),
    SoundCharacter.speaker => const _SoundCharacterProfile(
      biquadWet: 0.56,
      frequency: 7800,
      resonance: 0.4,
      bassWet: 0.12,
      bassBoost: 0.8,
      saturationWet: 0.18,
      saturation: 0.2,
    ),
    SoundCharacter.spatial => const _SoundCharacterProfile(
      echoWet: 0.09,
      echoDelay: 0.08,
      echoDecay: 0.18,
      echoFilter: 0.7,
    ),
  };
}

class _SoundCharacterProfile {
  const _SoundCharacterProfile({
    this.biquadWet = 0,
    this.biquadType = 0,
    this.frequency = 16000,
    this.resonance = 0.1,
    this.lofiWet = 0,
    this.sampleRate = 22000,
    this.bitDepth = 16,
    this.bassWet = 0,
    this.bassBoost = 0,
    this.saturationWet = 0,
    this.saturation = 0,
    this.echoWet = 0,
    this.echoDelay = 0.08,
    this.echoDecay = 0.1,
    this.echoFilter = 0,
  });

  final double biquadWet;
  final double biquadType;
  final double frequency;
  final double resonance;
  final double lofiWet;
  final double sampleRate;
  final double bitDepth;
  final double bassWet;
  final double bassBoost;
  final double saturationWet;
  final double saturation;
  final double echoWet;
  final double echoDelay;
  final double echoDecay;
  final double echoFilter;
}
