import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/domain/scene_recipe.dart';
import 'package:soundscape_client/domain/soundscape_catalog.dart';

void main() {
  test('scene recipe round-trips without UI metadata or file paths', () {
    final scene = SoundscapeCatalog.byId('rain-cabin');
    final encoded = SceneRecipe.fromScene(scene).toJson();
    final decoded = SceneRecipe.fromJson(encoded);
    final restored = decoded.applyTo(scene);

    expect(decoded.schemaVersion, 1);
    expect(decoded.sceneId, scene.id);
    expect(decoded.seed, scene.seed);
    expect(decoded.layers.map((layer) => layer.assetId), {
      'rain-cabin-development',
      'open-water-development',
    });
    expect(encoded.toString(), isNot(contains('assets/audio/')));
    expect(restored.name, scene.name);
    expect(restored.coverAsset, scene.coverAsset);
    expect(restored.layers.first.segmentIds, scene.layers.first.segmentIds);
  });

  test('recipe cannot be applied to unrelated scene metadata', () {
    final recipe = SceneRecipe.fromScene(SoundscapeCatalog.byId('rain-cabin'));

    expect(
      () => recipe.applyTo(SoundscapeCatalog.byId('coastal-night')),
      throwsArgumentError,
    );
  });

  test('untrusted recipe values are rejected before runtime execution', () {
    final json = SceneRecipe.fromScene(SoundscapeCatalog.byId('rain-cabin'))
        .toJson();
    json['schemaVersion'] = 2;

    expect(() => SceneRecipe.fromJson(json), throwsFormatException);
  });

  test('Dart decoder agrees with the shared contract fixtures', () {
    final fixtureFile = File(
      '../../contracts/fixtures/scene-recipe.v1.conformance.json',
    );
    final fixtures = (jsonDecode(fixtureFile.readAsStringSync()) as Map)
        .cast<String, Object?>();

    for (final fixtureValue in fixtures['valid']! as List<Object?>) {
      final fixture = (fixtureValue! as Map).cast<String, Object?>();
      final value = (fixture['value']! as Map).cast<String, Object?>();
      expect(
        () => SceneRecipe.fromJson(value),
        returnsNormally,
        reason: fixture['name']! as String,
      );
    }

    for (final fixtureValue in fixtures['invalid']! as List<Object?>) {
      final fixture = (fixtureValue! as Map).cast<String, Object?>();
      final value = (fixture['value']! as Map).cast<String, Object?>();
      expect(
        () => SceneRecipe.fromJson(value),
        throwsFormatException,
        reason: fixture['name']! as String,
      );
    }
  });
}
