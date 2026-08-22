import '../domain/soundscape_scene.dart';

class SoundscapeMix {
  const SoundscapeMix._({required this.gains, required this.eventDensity});

  factory SoundscapeMix.fromScene({
    required SoundscapeScene scene,
    required double intensity,
    required double richness,
    Map<String, double> presence = const {},
    Set<String> disabledLayers = const {},
  }) {
    final safeIntensity = intensity.clamp(0.0, 1.0);
    final safeRichness = richness.clamp(0.0, 1.0);
    final gains = <String, double>{};

    for (final layer in scene.layers) {
      final layerPresence = (presence[layer.id] ?? 1).clamp(0.0, 1.0);
      final macroGain =
          layer.baseGain +
          (layer.intensityGain * safeIntensity) +
          (layer.richnessGain * safeRichness);
      gains[layer.id] = disabledLayers.contains(layer.id)
          ? 0
          : (macroGain * layerPresence).clamp(0.0, 1.0);
    }

    return SoundscapeMix._(
      gains: Map.unmodifiable(gains),
      eventDensity: (0.18 + (safeRichness * 0.82)).clamp(0.0, 1.0),
    );
  }

  final Map<String, double> gains;
  final double eventDensity;

  double gainFor(String layerId) => gains[layerId] ?? 0;
}
