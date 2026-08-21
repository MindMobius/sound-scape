import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_mobile/domain/soundscape_catalog.dart';
import 'package:soundscape_mobile/domain/soundscape_scene.dart';

void main() {
  test('MVP catalog only exposes scenes backed by playable layers', () {
    expect(SoundscapeCatalog.scenes.map((scene) => scene.id), {
      'rain-cabin',
      'coastal-night',
    });
    for (final scene in SoundscapeCatalog.scenes) {
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
    }
  });

  test('unknown scene ids resolve to the initial scene', () {
    expect(SoundscapeCatalog.byId('missing'), SoundscapeCatalog.initialScene);
  });
}
