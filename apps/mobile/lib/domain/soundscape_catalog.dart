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

  static const scenes = <SoundscapeScene>[
    SoundscapeScene(
      id: 'rain-cabin',
      name: '雨夜木屋',
      description: '雷雨夜里，点燃篝火的木屋。',
      coverAsset: 'assets/images/rain-cabin-cover.jpg',
      heroAsset: 'assets/images/rain-cabin-hero.jpg',
      defaultIntensity: 0.46,
      defaultRichness: 0.62,
      layers: [
        SoundLayerDefinition(
          id: 'roof-rain',
          name: '屋檐雨',
          assetPath: 'assets/audio/rain-cabin.mp3',
          kind: SoundLayerKind.bed,
          baseGain: 0.30,
          intensityGain: 0.35,
          richnessGain: 0.02,
          pan: -0.05,
        ),
        SoundLayerDefinition(
          id: 'window-rain',
          name: '窗外雨幕',
          assetPath: 'assets/audio/rain-cabin.mp3',
          kind: SoundLayerKind.texture,
          baseGain: 0,
          intensityGain: 0.08,
          richnessGain: 0.20,
          pan: -0.32,
          seekOffset: Duration(seconds: 11),
        ),
        SoundLayerDefinition(
          id: 'eaves-water',
          name: '檐下水声',
          assetPath: 'assets/audio/open-water.wav',
          kind: SoundLayerKind.bed,
          baseGain: 0.04,
          intensityGain: 0.14,
          richnessGain: 0.01,
          pan: 0.16,
          seekOffset: Duration(seconds: 3),
        ),
        SoundLayerDefinition(
          id: 'damp-echo',
          name: '潮湿回响',
          assetPath: 'assets/audio/open-water.wav',
          kind: SoundLayerKind.event,
          baseGain: 0.01,
          intensityGain: 0.07,
          richnessGain: 0.14,
          pan: 0.24,
          eventDuration: Duration(milliseconds: 2900),
        ),
      ],
    ),
    SoundscapeScene(
      id: 'coastal-night',
      name: '深夜海岸',
      description: '深夜海岸上持续靠近又退去的潮声。',
      coverAsset: 'assets/images/coastal-night-cover.jpg',
      heroAsset: 'assets/images/coastal-night-hero.jpg',
      defaultIntensity: 0.52,
      defaultRichness: 0.56,
      layers: [
        SoundLayerDefinition(
          id: 'near-water',
          name: '近岸潮水',
          assetPath: 'assets/audio/open-water.wav',
          kind: SoundLayerKind.bed,
          baseGain: 0.28,
          intensityGain: 0.35,
          richnessGain: 0.02,
          pan: -0.06,
        ),
        SoundLayerDefinition(
          id: 'far-water',
          name: '远浪',
          assetPath: 'assets/audio/open-water.wav',
          kind: SoundLayerKind.texture,
          baseGain: 0.03,
          intensityGain: 0.12,
          richnessGain: 0.20,
          pan: 0.28,
          seekOffset: Duration(seconds: 7),
        ),
        SoundLayerDefinition(
          id: 'sea-mist',
          name: '海面细雨',
          assetPath: 'assets/audio/rain-cabin.mp3',
          kind: SoundLayerKind.bed,
          baseGain: 0.02,
          intensityGain: 0.08,
          richnessGain: 0.03,
          pan: -0.22,
          seekOffset: Duration(seconds: 5),
        ),
        SoundLayerDefinition(
          id: 'reef-echo',
          name: '礁石回响',
          assetPath: 'assets/audio/open-water.wav',
          kind: SoundLayerKind.event,
          baseGain: 0.01,
          intensityGain: 0.06,
          richnessGain: 0.16,
          pan: 0.34,
          eventDuration: Duration(milliseconds: 3400),
        ),
      ],
    ),
  ];

  static SoundscapeScene get initialScene => scenes.first;

  static SoundscapeScene byId(String id) =>
      scenes.firstWhere((scene) => scene.id == id, orElse: () => initialScene);
}
