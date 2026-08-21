import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_mobile/audio/soundscape_mix.dart';
import 'package:soundscape_mobile/domain/soundscape_catalog.dart';

void main() {
  test('intensity raises the energy of the bed layers', () {
    final scene = SoundscapeCatalog.byId('rain-cabin');
    final light = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.1,
      richness: 0.6,
    );
    final heavy = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.9,
      richness: 0.6,
    );

    expect(heavy.gainFor('roof-rain'), greaterThan(light.gainFor('roof-rain')));
    expect(
      heavy.gainFor('eaves-water'),
      greaterThan(light.gainFor('eaves-water')),
    );
    expect(heavy.gainFor('damp-echo'), greaterThan(light.gainFor('damp-echo')));
  });

  test('richness controls textures without muting the bed', () {
    final scene = SoundscapeCatalog.byId('coastal-night');
    final simple = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.5,
      richness: 0,
    );
    final rich = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.5,
      richness: 1,
    );

    expect(simple.gainFor('near-water'), greaterThan(0));
    expect(rich.gainFor('far-water'), greaterThan(simple.gainFor('far-water')));
    expect(rich.eventDensity, greaterThan(simple.eventDensity));
  });

  test('macro inputs are clamped to safe audio ranges', () {
    final scene = SoundscapeCatalog.initialScene;
    final mix = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 8,
      richness: -3,
    );

    expect(mix.gains.values, everyElement(inInclusiveRange(0, 1)));
    expect(mix.eventDensity, inInclusiveRange(0, 1));
  });

  test('per-layer presence and enabled state stay inside the mix', () {
    final scene = SoundscapeCatalog.initialScene;
    final mix = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.5,
      richness: 0.6,
      presence: const {'roof-rain': 0.25},
      disabledLayers: const {'damp-echo'},
    );
    final full = SoundscapeMix.fromScene(
      scene: scene,
      intensity: 0.5,
      richness: 0.6,
    );

    expect(
      mix.gainFor('roof-rain'),
      closeTo(full.gainFor('roof-rain') * 0.25, 0.001),
    );
    expect(mix.gainFor('damp-echo'), 0);
  });
}
