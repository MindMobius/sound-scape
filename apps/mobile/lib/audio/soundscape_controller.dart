import '../domain/soundscape_scene.dart';
import 'soundscape_runtime.dart';

abstract interface class SoundscapeController {
  SoundscapeSnapshot get snapshot;
  Stream<SoundscapeSnapshot> get snapshots;

  Future<void> play();
  Future<void> pause();
  Future<void> stop();
  Future<void> selectScene(String sceneId, {bool autoplay = true});

  void setMasterVolume(double value);
  void setIntensity(double value);
  void setRichness(double value);
  void setLayerPresence(String layerId, double value);
  void setLayerEnabled(String layerId, {required bool enabled});
  void applyPreset(ListeningPreset preset);
  void setSleepTimer(Duration? duration);
}
