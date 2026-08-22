import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/domain/scene_recipe.dart';
import 'package:soundscape_client/domain/soundscape_catalog.dart';
import 'package:soundscape_client/domain/soundscape_scene.dart';

void main() {
  test('MVP catalog only exposes scenes backed by playable layers', () {
    expect(SoundscapeCatalog.scenes.map((scene) => scene.id), {
      'rain-cabin',
      'coastal-night',
    });
    for (final scene in SoundscapeCatalog.scenes) {
      expect(scene.schemaVersion, 1);
      expect(scene.seed, greaterThan(0));
      expect(scene.layers, isNotEmpty);
      expect(
        scene.layers.any((layer) => layer.kind == SoundLayerKind.bed),
        isTrue,
      );
      expect(
        scene.layers.any((layer) => layer.kind == SoundLayerKind.event),
        isTrue,
      );
      expect(scene.coverAsset, endsWith('.jpg'));
      expect(scene.heroAsset, endsWith('.jpg'));
      expect(
        scene.layers.map((layer) => layer.assetId),
        everyElement(isNotEmpty),
      );
      expect(
        scene.layers.map((layer) => layer.segmentIds),
        everyElement(isNotEmpty),
      );
    }
  });

  test('unknown scene ids resolve to the initial scene', () {
    expect(SoundscapeCatalog.byId('missing'), SoundscapeCatalog.initialScene);
  });

  test('generated scenes match the canonical cross-platform catalog', () {
    final index = (jsonDecode(
      File('../../assets/scenes/index.json').readAsStringSync(),
    ) as Map).cast<String, Object?>();
    final playableCatalog = (jsonDecode(
      File('../../assets/scenes/playable-scenes.v1.json').readAsStringSync(),
    ) as Map).cast<String, Object?>();
    final playableById = {
      for (final value in playableCatalog['scenes']! as List<Object?>)
        (_jsonMap(value)['sceneId']! as String): _jsonMap(value),
    };
    final expectedIds = <String>[];

    for (final value in index['scenes']! as List<Object?>) {
      final entry = (value! as Map).cast<String, Object?>();
      final sceneId = entry['id']! as String;
      final playable = playableById[sceneId];
      if (playable == null) continue;
      expectedIds.add(sceneId);

      final manifest = (jsonDecode(
        File('../../${entry['manifest']! as String}').readAsStringSync(),
      ) as Map).cast<String, Object?>();
      final recipe = SceneRecipe.fromJson(
        (playable['recipe']! as Map).cast<String, Object?>(),
      );
      final generated = SoundscapeCatalog.byId(sceneId);

      expect(generated.name, manifest['name']);
      expect(generated.description, manifest['description']);
      expect(SceneRecipe.fromScene(generated).toJson(), recipe.toJson());
    }

    expect(SoundscapeCatalog.scenes.map((scene) => scene.id), expectedIds);
    expect(SoundscapeCatalog.initialScene.id, index['defaultScene']);
  });
}

Map<String, Object?> _jsonMap(Object? value) =>
    (value! as Map).cast<String, Object?>();
