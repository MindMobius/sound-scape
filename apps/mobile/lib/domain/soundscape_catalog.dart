import 'generated/soundscape_catalog.g.dart';
import 'soundscape_scene.dart';

abstract final class SoundscapeCatalog {
  static const presets = <ListeningPreset>[
    ListeningPreset(id: 'settle', name: '舒缓', intensity: 0.28, richness: 0.34),
    ListeningPreset(
      id: 'balanced',
      name: '均衡',
      intensity: 0.52,
      richness: 0.60,
    ),
    ListeningPreset(
      id: 'immersive',
      name: '丰沛',
      intensity: 0.76,
      richness: 0.84,
    ),
  ];

  static const scenes = generatedSoundscapeScenes;

  static SoundscapeScene get initialScene => scenes.first;

  static SoundscapeScene byId(String id) =>
      scenes.firstWhere((scene) => scene.id == id, orElse: () => initialScene);
}
