import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_soloud/flutter_soloud.dart';

import '../data/bundled_sound_library.dart';
import '../data/local_soundscape_state_store.dart';
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
  final Duration? sleepTimerRemaining;
  final String? error;

  bool get isPlaying => phase == SoundscapePhase.playing;
  bool get isReady =>
      phase != SoundscapePhase.initializing && phase != SoundscapePhase.failed;
  int get activeLayerCount => layers.where((layer) => layer.enabled).length;

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
  }) : _soundLibrary = soundLibrary ?? BundledSoundLibrary(),
       _stateStore = stateStore ?? LocalSoundscapeStateStore();

  final SoLoud _soloud = SoLoud.instance;
  final BundledSoundLibrary _soundLibrary;
  final SoundscapeStateStore _stateStore;
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
  final Set<String> _favoriteSceneIds = {};
  final List<SavedSoundscapePreset> _savedPresets = [];
  final Map<String, Timer> _textureTimers = {};
  final Map<String, Timer> _eventTimers = {};

  Future<void>? _initialization;
  Timer? _stateSaveTimer;
  late SoundLibrary _library;
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
        _scene.layers.map(
          (definition) => SoundLayerSnapshot(
            definition: definition,
            enabled: !disabled.contains(definition.id),
            presence: presence[definition.id] ?? 1,
            effectiveGain: mix.gainFor(definition.id),
          ),
        ),
      ),
      favoriteSceneIds: Set.unmodifiable(_favoriteSceneIds),
      savedPresets: List.unmodifiable(_savedPresets),
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
      for (final layer in _scene.layers)
        if (!layer.enabledByDefault) layer.id,
    },
  );

  SoundscapeMix get _mix => SoundscapeMix.fromScene(
    scene: _scene,
    intensity: _intensity,
    richness: _richness,
    presence: _currentPresence,
    disabledLayers: _currentDisabled,
  );

  Future<void> initialize() => _initialization ??= _initialize();

  Future<void> _initialize() async {
    try {
      _library = await _soundLibrary.load();
      final libraryIssues = _library.integrityIssues(
        scenes: SoundscapeCatalog.scenes,
      );
      final recipeIssues = [
        for (final scene in SoundscapeCatalog.scenes)
          ...SceneRecipe.fromScene(scene).validationIssues(),
      ];
      if (libraryIssues.isNotEmpty || recipeIssues.isNotEmpty) {
        throw StateError(
          [
            ...libraryIssues.map((issue) => issue.message),
            ...recipeIssues,
          ].join('\n'),
        );
      }
      await _restoreState();
      _scheduler = SoundscapeScheduler(scene: _scene, library: _library);

      if (!_soloud.isInitialized) await _soloud.init();

      final assetPaths = <String>{
        for (final scene in SoundscapeCatalog.scenes)
          for (final layer in scene.layers)
            for (final segmentId in layer.segmentIds)
              _library.assetById(layer.assetId).segmentById(segmentId).path,
      };
      for (final assetPath in assetPaths) {
        _sources[assetPath] = await _soloud.loadAsset(
          assetPath,
          mode: LoadMode.disk,
        );
      }

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
    _scheduler = SoundscapeScheduler(scene: _scene, library: _library);
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
    if (!_scene.layers.any((layer) => layer.id == layerId)) return;
    _currentPresence[layerId] = value.clamp(0.0, 1.0);
    _applyMix();
    _scheduleStateSave();
    _emit();
  }

  void setLayerEnabled(String layerId, {required bool enabled}) {
    if (!_scene.layers.any((layer) => layer.id == layerId)) return;
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
      _scene = SoundscapeCatalog.byId(state.selectedSceneId);
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
        final layerIds = scene.layers.map((layer) => layer.id).toSet();
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
              ),
          },
          favoriteSceneIds: _favoriteSceneIds,
          savedPresets: _savedPresets,
        ),
      );
    } catch (error, stackTrace) {
      debugPrint('Soundscape state save failed: $error\n$stackTrace');
    }
  }

  Future<void> _ensureVoices() async {
    if (_voicesReady) return;

    _buses[SoundLayerKind.bed] = _soloud.createMixingBus(name: 'environment')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.texture] = _soloud.createMixingBus(name: 'texture')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.event] = _soloud.createMixingBus(name: 'events')
      ..playOnEngine(paused: true);

    final mix = _mix;
    for (final layer in _scene.layers) {
      if (layer.kind == SoundLayerKind.event) continue;
      final segment = _library
          .assetById(layer.assetId)
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
    for (final layer in _scene.layers) {
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

  void _startDynamics() {
    _stopDynamics();
    for (final layer in _scene.layers) {
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
    if (handle != null) _eventHandles.add(handle);
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
    for (final layer in _scene.layers.where(
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
