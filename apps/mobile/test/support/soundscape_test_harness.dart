import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_mobile/audio/soundscape_controller.dart';
import 'package:soundscape_mobile/audio/soundscape_mix.dart';
import 'package:soundscape_mobile/audio/soundscape_runtime.dart';
import 'package:soundscape_mobile/domain/soundscape_catalog.dart';
import 'package:soundscape_mobile/domain/soundscape_scene.dart';

Future<void> pumpSoundscapeMotion(WidgetTester tester, {int frames = 7}) async {
  for (var frame = 0; frame < frames; frame++) {
    await tester.pump(const Duration(milliseconds: 90));
  }
}

class FakeSoundscapeController implements SoundscapeController {
  final StreamController<SoundscapeSnapshot> _states =
      StreamController<SoundscapeSnapshot>.broadcast();
  late SoundscapeSnapshot _snapshot = _buildSnapshot();

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
    final mix = SoundscapeMix.fromScene(
      scene: selectedScene,
      intensity: intensity,
      richness: richness,
    );
    return SoundscapeSnapshot(
      phase: phase,
      scene: selectedScene,
      masterVolume: 0.52,
      intensity: intensity,
      richness: richness,
      layers: [
        for (final definition in selectedScene.layers)
          SoundLayerSnapshot(
            definition: definition,
            enabled: true,
            presence: 1,
            effectiveGain: mix.gainFor(definition.id),
          ),
      ],
    );
  }

  void _emit() => _states.add(_snapshot);

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
  void applyPreset(ListeningPreset preset) {}

  @override
  Future<void> applySavedPreset(String presetId) async {}

  @override
  void deleteSavedPreset(String presetId) {}

  @override
  void saveCurrentAsPreset({required String id, required String name}) {}

  @override
  void setSceneFavorite(String sceneId, {required bool favorite}) {}

  @override
  void setIntensity(double value) {}

  @override
  void setLayerEnabled(String layerId, {required bool enabled}) {}

  @override
  void setLayerPresence(String layerId, double value) {}

  @override
  void setMasterVolume(double value) {}

  @override
  void setRichness(double value) {}

  @override
  void setSleepTimer(Duration? duration) {}
}
