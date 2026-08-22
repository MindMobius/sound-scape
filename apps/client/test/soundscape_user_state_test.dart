import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/data/local_soundscape_state_store_io.dart';
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
          mix: SceneMixState(intensity: 0.51, richness: 0.77),
        ),
      ],
      scenes: {
        'coastal-night': SceneMixState(
          intensity: 0.63,
          richness: 0.71,
          layerPresence: const {'far-water': 0.36},
          disabledLayerIds: const {'sea-mist'},
        ),
      },
    );

    final restored = SoundscapeUserState.fromJson(state.toJson());

    expect(restored.selectedSceneId, 'coastal-night');
    expect(restored.masterVolume, 0.42);
    expect(restored.favoriteSceneIds, contains('coastal-night'));
    expect(restored.savedPresets.single.name, '更远的潮声');
    expect(restored.scenes['coastal-night']?.intensity, 0.63);
    expect(restored.scenes['coastal-night']?.layerPresence['far-water'], 0.36);
    expect(
      restored.scenes['coastal-night']?.disabledLayerIds,
      contains('sea-mist'),
    );
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
