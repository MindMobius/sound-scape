import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/audio/soundscape_controller.dart';
import 'package:soundscape_client/audio/soundscape_mix.dart';
import 'package:soundscape_client/audio/soundscape_runtime.dart';
import 'package:soundscape_client/domain/sound_asset.dart';
import 'package:soundscape_client/domain/soundscape_catalog.dart';
import 'package:soundscape_client/domain/soundscape_scene.dart';
import 'package:soundscape_client/domain/soundscape_user_state.dart';

Future<void> pumpSoundscapeMotion(WidgetTester tester, {int frames = 7}) async {
  for (var frame = 0; frame < frames; frame++) {
    await tester.pump(const Duration(milliseconds: 90));
  }
}

class FakeSoundscapeController implements SoundscapeController {
  FakeSoundscapeController() {
    _soundAssets.addAll([
      _testSoundAsset(
        id: 'test.wind',
        name: '窗外晚风',
        category: SoundAssetCategory.weather,
      ),
      _testSoundAsset(
        id: 'test.bell',
        name: '远处钟声',
        category: SoundAssetCategory.place,
        purpose: SoundSegmentPurpose.event,
      ),
      _testSoundAsset(
        id: 'test.radio',
        name: '棕色噪声',
        category: SoundAssetCategory.device,
      ),
    ]);
    _snapshot = _buildSnapshot();
  }

  final StreamController<SoundscapeSnapshot> _states =
      StreamController<SoundscapeSnapshot>.broadcast();
  final List<SoundAsset> _soundAssets = [];
  final List<ImportedSoundRecord> _importedSounds = [];
  final Set<String> _favoriteSceneIds = {};
  final List<SavedSoundscapePreset> _savedPresets = [];
  final Map<String, List<String>> _addedAssetsByScene = {};
  final Map<String, Map<String, double>> _presenceByScene = {};
  final Map<String, Set<String>> _disabledByScene = {};
  final Map<String, Map<String, SoundCharacter>> _charactersByScene = {};
  late SoundscapeSnapshot _snapshot;
  double _masterVolume = 0.52;
  Duration? _sleepTimer;

  @override
  SoundscapeSnapshot get snapshot => _snapshot;

  @override
  Stream<SoundscapeSnapshot> get snapshots => _states.stream;

  Future<void> close() => _states.close();

  SoundscapeSnapshot _buildSnapshot({
    SoundscapeScene? scene,
    SoundscapePhase phase = SoundscapePhase.ready,
    double intensity = 0.46,
    double richness = 0.62,
  }) {
    final selectedScene = scene ?? SoundscapeCatalog.initialScene;
    final addedAssetIds = _addedAssetsByScene[selectedScene.id] ?? const [];
    final definitions = [
      ...selectedScene.layers,
      for (final assetId in addedAssetIds)
        _dynamicLayerFor(
          _soundAssets.firstWhere((asset) => asset.id == assetId),
        ),
    ];
    final runtimeScene = SoundscapeScene(
      schemaVersion: selectedScene.schemaVersion,
      seed: selectedScene.seed,
      id: selectedScene.id,
      name: selectedScene.name,
      description: selectedScene.description,
      coverAsset: selectedScene.coverAsset,
      heroAsset: selectedScene.heroAsset,
      layers: definitions,
      defaultIntensity: selectedScene.defaultIntensity,
      defaultRichness: selectedScene.defaultRichness,
    );
    final presence = _presenceByScene.putIfAbsent(selectedScene.id, () => {});
    final disabled = _disabledByScene.putIfAbsent(
      selectedScene.id,
      () => {
        for (final layer in selectedScene.layers)
          if (!layer.enabledByDefault) layer.id,
      },
    );
    final characters = _charactersByScene.putIfAbsent(
      selectedScene.id,
      () => {},
    );
    final mix = SoundscapeMix.fromScene(
      scene: runtimeScene,
      intensity: intensity,
      richness: richness,
      presence: presence,
      disabledLayers: disabled,
    );
    return SoundscapeSnapshot(
      phase: phase,
      scene: selectedScene,
      masterVolume: _masterVolume,
      intensity: intensity,
      richness: richness,
      sleepTimerRemaining: _sleepTimer,
      layers: [
        for (final definition in definitions)
          SoundLayerSnapshot(
            definition: definition,
            enabled: !disabled.contains(definition.id),
            presence:
                presence[definition.id] ??
                (definition.id.startsWith('library:') ? 0.72 : 1),
            effectiveGain: mix.gainFor(definition.id),
            character: characters[definition.id] ?? SoundCharacter.natural,
            userAdded: definition.id.startsWith('library:'),
          ),
      ],
      favoriteSceneIds: Set.unmodifiable(_favoriteSceneIds),
      savedPresets: List.unmodifiable(_savedPresets),
      soundAssets: List.unmodifiable(_soundAssets),
      importedSounds: List.unmodifiable(_importedSounds),
      addedSoundAssetIds: List.unmodifiable(addedAssetIds),
    );
  }

  void _emit() => _states.add(_snapshot);

  void _rebuild({
    SoundscapeScene? scene,
    SoundscapePhase? phase,
    double? intensity,
    double? richness,
  }) {
    _snapshot = _buildSnapshot(
      scene: scene ?? _snapshot.scene,
      phase: phase ?? _snapshot.phase,
      intensity: intensity ?? _snapshot.intensity,
      richness: richness ?? _snapshot.richness,
    );
    _emit();
  }

  @override
  Future<void> pause() async {
    _snapshot = _buildSnapshot(
      scene: _snapshot.scene,
      phase: SoundscapePhase.paused,
      intensity: _snapshot.intensity,
      richness: _snapshot.richness,
    );
    _emit();
  }

  @override
  Future<void> play() async {
    _snapshot = _buildSnapshot(
      scene: _snapshot.scene,
      phase: SoundscapePhase.playing,
      intensity: _snapshot.intensity,
      richness: _snapshot.richness,
    );
    _emit();
  }

  @override
  Future<void> selectScene(String sceneId, {bool autoplay = true}) async {
    _snapshot = _buildSnapshot(
      scene: SoundscapeCatalog.byId(sceneId),
      phase: autoplay ? SoundscapePhase.playing : SoundscapePhase.ready,
    );
    _emit();
  }

  @override
  Future<void> stop() async {}

  @override
  void applyPreset(ListeningPreset preset) {
    _rebuild(intensity: preset.intensity, richness: preset.richness);
  }

  @override
  Future<void> applySavedPreset(String presetId) async {
    final preset = _savedPresets.firstWhere((item) => item.id == presetId);
    _addedAssetsByScene[preset.sceneId] = [
      for (final assetId in preset.mix.addedAssetIds)
        if (_soundAssets.any((asset) => asset.id == assetId)) assetId,
    ];
    _presenceByScene[preset.sceneId] = Map.of(preset.mix.layerPresence);
    _disabledByScene[preset.sceneId] = Set.of(preset.mix.disabledLayerIds);
    _charactersByScene[preset.sceneId] = Map.of(preset.mix.layerCharacters);
    _snapshot = _buildSnapshot(
      scene: SoundscapeCatalog.byId(preset.sceneId),
      phase: _snapshot.phase,
      intensity: preset.mix.intensity,
      richness: preset.mix.richness,
    );
    _emit();
  }

  @override
  Future<void> addSoundAsset(String assetId) async {
    final sceneId = _snapshot.scene.id;
    final added = _addedAssetsByScene.putIfAbsent(sceneId, () => []);
    if (_snapshot.scene.layers.any((layer) => layer.assetId == assetId) ||
        added.contains(assetId)) {
      return;
    }
    added.add(assetId);
    _presenceByScene.putIfAbsent(sceneId, () => {})['library:$assetId'] = 0.72;
    _rebuild();
  }

  @override
  Future<void> removeSoundLayer(String layerId) async {
    final sceneId = _snapshot.scene.id;
    final assetId = layerId.replaceFirst('library:', '');
    _addedAssetsByScene[sceneId]?.remove(assetId);
    _presenceByScene[sceneId]?.remove(layerId);
    _disabledByScene[sceneId]?.remove(layerId);
    _charactersByScene[sceneId]?.remove(layerId);
    _rebuild();
  }

  @override
  Future<SoundAsset?> importSound() async {
    final existing = _soundAssets
        .where((asset) => asset.id == 'user.test-import')
        .firstOrNull;
    if (existing != null) return existing;
    final asset = _testSoundAsset(
      id: 'user.test-import',
      name: '我的海浪',
      category: SoundAssetCategory.custom,
      imported: true,
    );
    _soundAssets.add(asset);
    _importedSounds.add(
      ImportedSoundRecord(
        asset: asset,
        originalFileName: '我的海浪.wav',
        byteLength: 4096,
        importedAt: DateTime.utc(2026, 8, 23),
      ),
    );
    _rebuild();
    return asset;
  }

  @override
  void renameImportedSound(String assetId, String name) {
    final assetIndex = _soundAssets.indexWhere((asset) => asset.id == assetId);
    final recordIndex = _importedSounds.indexWhere(
      (record) => record.asset.id == assetId,
    );
    if (assetIndex < 0 || recordIndex < 0) return;
    final renamed = _soundAssets[assetIndex].copyWith(
      name: SoundLocalizedText({'zh-CN': name.trim()}),
    );
    _soundAssets[assetIndex] = renamed;
    _importedSounds[recordIndex] = _importedSounds[recordIndex].copyWith(
      asset: renamed,
    );
    _rebuild();
  }

  @override
  Future<void> deleteImportedSound(String assetId) async {
    _soundAssets.removeWhere((asset) => asset.id == assetId);
    _importedSounds.removeWhere((record) => record.asset.id == assetId);
    for (final added in _addedAssetsByScene.values) {
      added.remove(assetId);
    }
    final layerId = 'library:$assetId';
    for (final presence in _presenceByScene.values) {
      presence.remove(layerId);
    }
    for (final disabled in _disabledByScene.values) {
      disabled.remove(layerId);
    }
    for (final characters in _charactersByScene.values) {
      characters.remove(layerId);
    }
    _rebuild();
  }

  @override
  void deleteSavedPreset(String presetId) {
    _savedPresets.removeWhere((preset) => preset.id == presetId);
    _rebuild();
  }

  @override
  void saveCurrentAsPreset({required String id, required String name}) {
    final sceneId = _snapshot.scene.id;
    _savedPresets.add(
      SavedSoundscapePreset(
        id: id,
        name: name.trim(),
        sceneId: sceneId,
        createdAt: DateTime.utc(2026, 8, 23),
        mix: SceneMixState(
          intensity: _snapshot.intensity,
          richness: _snapshot.richness,
          layerPresence: _presenceByScene[sceneId] ?? const {},
          disabledLayerIds: _disabledByScene[sceneId] ?? const {},
          addedAssetIds: _addedAssetsByScene[sceneId] ?? const [],
          layerCharacters: _charactersByScene[sceneId] ?? const {},
        ),
      ),
    );
    _rebuild();
  }

  @override
  void renameSavedPreset(String presetId, String name) {
    final index = _savedPresets.indexWhere((preset) => preset.id == presetId);
    if (index < 0) return;
    _savedPresets[index] = _savedPresets[index].copyWith(name: name.trim());
    _rebuild();
  }

  @override
  void setSceneFavorite(String sceneId, {required bool favorite}) {
    favorite
        ? _favoriteSceneIds.add(sceneId)
        : _favoriteSceneIds.remove(sceneId);
    _rebuild();
  }

  @override
  void setIntensity(double value) => _rebuild(intensity: value);

  @override
  void setLayerEnabled(String layerId, {required bool enabled}) {
    final disabled = _disabledByScene.putIfAbsent(_snapshot.scene.id, () => {});
    enabled ? disabled.remove(layerId) : disabled.add(layerId);
    _rebuild();
  }

  @override
  void setLayerCharacter(String layerId, SoundCharacter character) {
    _charactersByScene.putIfAbsent(_snapshot.scene.id, () => {})[layerId] =
        character;
    _rebuild();
  }

  @override
  void setLayerPresence(String layerId, double value) {
    _presenceByScene.putIfAbsent(_snapshot.scene.id, () => {})[layerId] = value;
    _rebuild();
  }

  @override
  void setMasterVolume(double value) {
    _masterVolume = value;
    _rebuild();
  }

  @override
  void setRichness(double value) => _rebuild(richness: value);

  @override
  void setSleepTimer(Duration? duration) {
    _sleepTimer = duration;
    _rebuild();
  }
}

SoundAsset _testSoundAsset({
  required String id,
  required String name,
  required SoundAssetCategory category,
  SoundSegmentPurpose purpose = SoundSegmentPurpose.loop,
  bool imported = false,
}) {
  return SoundAsset(
    id: id,
    metadataVersion: 1,
    fileVersion: 1,
    category: category,
    name: SoundLocalizedText({'zh-CN': name}),
    availability: imported
        ? SoundAssetAvailability.imported
        : SoundAssetAvailability.bundled,
    releaseStatus: imported
        ? SoundAssetReleaseStatus.blocked
        : SoundAssetReleaseStatus.approved,
    sha256: 'b' * 64,
    source: SoundSource(
      name: imported ? '用户导入' : '测试声音包',
      provenance: imported
          ? SoundAssetProvenance.userProvided
          : SoundAssetProvenance.verified,
      license: SoundLicense(
        name: imported ? '用户私有素材' : 'CC0 1.0',
        spdxId: imported ? null : 'CC0-1.0',
        redistributionAllowed: !imported,
      ),
    ),
    segments: [
      SoundSegment(
        id: 'main',
        path: imported ? r'C:\soundscape\imports\test.wav' : 'assets/test.wav',
        purpose: purpose,
        duration: purpose == SoundSegmentPurpose.event
            ? const Duration(seconds: 3)
            : null,
      ),
    ],
    previewSegmentId: 'main',
  );
}

SoundLayerDefinition _dynamicLayerFor(SoundAsset asset) {
  final event = asset.segments.every(
    (segment) => segment.purpose == SoundSegmentPurpose.event,
  );
  return SoundLayerDefinition(
    id: 'library:${asset.id}',
    name: asset.name.resolve(),
    assetId: asset.id,
    segmentIds: const ['main'],
    kind: event ? SoundLayerKind.event : SoundLayerKind.texture,
    baseGain: event ? 0.04 : 0.12,
    intensityGain: 0.08,
    richnessGain: 0.08,
  );
}
