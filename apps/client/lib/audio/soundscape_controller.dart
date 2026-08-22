import '../domain/sound_asset.dart';
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
  void setLayerCharacter(String layerId, SoundCharacter character);
  Future<void> addSoundAsset(String assetId);
  Future<void> removeSoundLayer(String layerId);
  Future<SoundAsset?> importSound();
  void renameImportedSound(String assetId, String name);
  Future<void> deleteImportedSound(String assetId);
  void applyPreset(ListeningPreset preset);
  void setSceneFavorite(String sceneId, {required bool favorite});
  void saveCurrentAsPreset({required String id, required String name});
  void renameSavedPreset(String presetId, String name);
  void deleteSavedPreset(String presetId);
  Future<void> applySavedPreset(String presetId);
  void setSleepTimer(Duration? duration);
}
