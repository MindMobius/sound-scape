import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/data/local_soundscape_state_store_io.dart';
import 'package:soundscape_client/domain/sound_asset.dart';
import 'package:soundscape_client/domain/soundscape_scene.dart';
import 'package:soundscape_client/domain/soundscape_user_state.dart';

void main() {
  test('state model round-trips scene macros and per-layer choices', () {
    final state = SoundscapeUserState(
      schemaVersion: SoundscapeUserState.currentSchemaVersion,
      selectedSceneId: 'coastal-night',
      masterVolume: 0.42,
      favoriteSceneIds: const {'coastal-night'},
      savedPresets: [
        SavedSoundscapePreset(
          id: 'preset-night',
          name: '更远的潮声',
          sceneId: 'coastal-night',
          createdAt: DateTime.utc(2026, 8, 22),
          mix: SceneMixState(
            intensity: 0.51,
            richness: 0.77,
            addedAssetIds: const ['user.demo'],
            layerCharacters: const {'library:user.demo': SoundCharacter.radio},
          ),
        ),
      ],
      importedSounds: [_importedSound()],
      scenes: {
        'coastal-night': SceneMixState(
          intensity: 0.63,
          richness: 0.71,
          layerPresence: const {'far-water': 0.36},
          disabledLayerIds: const {'sea-mist'},
          addedAssetIds: const ['user.demo'],
          layerCharacters: const {'library:user.demo': SoundCharacter.tube},
        ),
      },
    );

    final restored = SoundscapeUserState.fromJson(state.toJson());

    expect(restored.selectedSceneId, 'coastal-night');
    expect(restored.masterVolume, 0.42);
    expect(restored.favoriteSceneIds, contains('coastal-night'));
    expect(restored.savedPresets.single.name, '更远的潮声');
    expect(restored.savedPresets.single.mix.addedAssetIds, ['user.demo']);
    expect(
      restored.savedPresets.single.mix.layerCharacters['library:user.demo'],
      SoundCharacter.radio,
    );
    expect(restored.importedSounds.single.originalFileName, '海边录音.wav');
    expect(restored.importedSounds.single.asset.name.resolve(), '海边录音');
    expect(restored.scenes['coastal-night']?.intensity, 0.63);
    expect(restored.scenes['coastal-night']?.layerPresence['far-water'], 0.36);
    expect(
      restored.scenes['coastal-night']?.disabledLayerIds,
      contains('sea-mist'),
    );
    expect(restored.scenes['coastal-night']?.addedAssetIds, ['user.demo']);
    expect(
      restored.scenes['coastal-night']?.layerCharacters['library:user.demo'],
      SoundCharacter.tube,
    );
  });

  test('schema v1 migrates with empty dynamic sound fields', () {
    final restored = SoundscapeUserState.fromJson({
      'schemaVersion': 1,
      'selectedSceneId': 'rain-cabin',
      'masterVolume': 0.5,
      'scenes': {
        'rain-cabin': {
          'intensity': 0.4,
          'richness': 0.6,
          'layerPresence': {'roof-rain': 0.8},
          'disabledLayerIds': ['distant-thunder'],
        },
      },
      'favoriteSceneIds': ['rain-cabin'],
      'savedPresets': <Object?>[],
    });

    expect(restored.schemaVersion, SoundscapeUserState.currentSchemaVersion);
    expect(restored.importedSounds, isEmpty);
    expect(restored.scenes['rain-cabin']?.addedAssetIds, isEmpty);
    expect(restored.scenes['rain-cabin']?.layerCharacters, isEmpty);
    expect(restored.scenes['rain-cabin']?.layerPresence['roof-rain'], 0.8);
  });

  test('local store persists one versioned state file', () async {
    final directory = await Directory.systemTemp.createTemp(
      'soundscape-state-test-',
    );
    addTearDown(() async {
      if (await directory.exists()) await directory.delete(recursive: true);
    });
    final store = LocalSoundscapeStateStore(
      directoryPathProvider: () async => directory.path,
    );
    final state = SoundscapeUserState(
      schemaVersion: SoundscapeUserState.currentSchemaVersion,
      selectedSceneId: 'rain-cabin',
      masterVolume: 0.58,
      scenes: {'rain-cabin': SceneMixState(intensity: 0.4, richness: 0.6)},
    );

    await store.save(state);
    final restored = await store.load();

    expect(restored?.selectedSceneId, state.selectedSceneId);
    expect(restored?.masterVolume, state.masterVolume);
    expect(
      await File(
        '${directory.path}${Platform.pathSeparator}'
        '${LocalSoundscapeStateStore.fileName}',
      ).exists(),
      isTrue,
    );
  });

  test('unsupported state schemas are rejected instead of guessed', () {
    expect(
      () => SoundscapeUserState.fromJson(const {
        'schemaVersion': 99,
        'selectedSceneId': 'rain-cabin',
        'masterVolume': 0.5,
        'scenes': <String, Object?>{},
      }),
      throwsFormatException,
    );
  });
}

ImportedSoundRecord _importedSound() {
  return ImportedSoundRecord(
    originalFileName: '海边录音.wav',
    byteLength: 4096,
    importedAt: DateTime.utc(2026, 8, 23),
    asset: SoundAsset(
      id: 'user.demo',
      metadataVersion: 1,
      fileVersion: 1,
      category: SoundAssetCategory.custom,
      name: SoundLocalizedText(const {'zh-CN': '海边录音'}),
      availability: SoundAssetAvailability.imported,
      releaseStatus: SoundAssetReleaseStatus.blocked,
      sha256: 'a' * 64,
      source: SoundSource(
        name: '用户导入',
        provenance: SoundAssetProvenance.userProvided,
        license: const SoundLicense(
          name: '用户私有素材，授权范围未知',
          redistributionAllowed: false,
        ),
      ),
      segments: const [
        SoundSegment(
          id: 'main',
          path: r'C:\Soundscape\imports\demo.wav',
          purpose: SoundSegmentPurpose.loop,
        ),
      ],
      previewSegmentId: 'main',
      tags: const ['用户素材'],
    ),
  );
}
