import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_mobile/audio/soundscape_scheduler.dart';
import 'package:soundscape_mobile/data/bundled_sound_library.dart';
import 'package:soundscape_mobile/domain/sound_asset.dart';
import 'package:soundscape_mobile/domain/soundscape_catalog.dart';
import 'package:soundscape_mobile/domain/soundscape_scene.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SoundLibrary library;

  setUpAll(() async {
    library = await BundledSoundLibrary().load();
  });

  test('same scene seed reproduces the same event plan', () {
    final scene = SoundscapeCatalog.byId('rain-cabin');
    final layer = scene.layers.firstWhere(
      (candidate) => candidate.kind == SoundLayerKind.event,
    );
    final first = SoundscapeScheduler(scene: scene, library: library);
    final second = SoundscapeScheduler(scene: scene, library: library);

    final firstPlans = [
      for (var index = 0; index < 12; index++)
        first.nextEvent(layer: layer, density: 0.58),
    ];
    final secondPlans = [
      for (var index = 0; index < 12; index++)
        second.nextEvent(layer: layer, density: 0.58),
    ];

    expect(firstPlans.map(_eventSignature), secondPlans.map(_eventSignature));
  });

  test('multi-segment events never repeat the same take immediately', () {
    final scene = SoundscapeCatalog.byId('coastal-night');
    final layer = scene.layers.firstWhere(
      (candidate) => candidate.kind == SoundLayerKind.event,
    );
    final scheduler = SoundscapeScheduler(scene: scene, library: library);
    final segmentIds = [
      for (var index = 0; index < 24; index++)
        scheduler.nextEvent(layer: layer, density: 0.5).segment.id,
    ];

    for (var index = 1; index < segmentIds.length; index++) {
      expect(segmentIds[index], isNot(segmentIds[index - 1]));
    }
  });

  test(
    'richer scenes shorten silence without changing the random sequence',
    () {
      final scene = SoundscapeCatalog.byId('rain-cabin');
      final layer = scene.layers.firstWhere(
        (candidate) => candidate.kind == SoundLayerKind.event,
      );
      final sparse = SoundscapeScheduler(scene: scene, library: library);
      final rich = SoundscapeScheduler(scene: scene, library: library);

      for (var index = 0; index < 12; index++) {
        final sparsePlan = sparse.nextEvent(layer: layer, density: 0);
        final richPlan = rich.nextEvent(layer: layer, density: 1);
        expect(richPlan.segment.id, sparsePlan.segment.id);
        expect(richPlan.delay, lessThan(sparsePlan.delay));
      }
    },
  );

  test('texture changes stay inside the declared motion envelope', () {
    final scene = SoundscapeCatalog.byId('rain-cabin');
    final layer = scene.layers.firstWhere(
      (candidate) => candidate.kind == SoundLayerKind.texture,
    );
    final scheduler = SoundscapeScheduler(scene: scene, library: library);

    for (var index = 0; index < 20; index++) {
      final change = scheduler.nextTextureChange(layer);
      expect(
        change.delay.inMilliseconds,
        inInclusiveRange(
          layer.dynamics.minimumChangeInterval.inMilliseconds,
          layer.dynamics.maximumChangeInterval.inMilliseconds,
        ),
      );
      expect(
        change.transition.inMilliseconds,
        inInclusiveRange(
          layer.dynamics.minimumTransition.inMilliseconds,
          layer.dynamics.maximumTransition.inMilliseconds,
        ),
      );
      expect(change.gainScale, inInclusiveRange(0.86, 1.14));
      expect(change.pan, inInclusiveRange(-1, 1));
    }
  });
}

String _eventSignature(ScheduledSoundEvent plan) {
  return [
    plan.segment.id,
    plan.delay.inMilliseconds,
    plan.duration.inMilliseconds,
    plan.gainScale.toStringAsFixed(8),
    plan.pan.toStringAsFixed(8),
    plan.bridgeSegment?.id ?? '-',
  ].join('|');
}
