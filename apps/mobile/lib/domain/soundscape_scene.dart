import 'package:flutter/foundation.dart';

enum SoundLayerKind { bed, texture, event }

@immutable
class ListeningPreset {
  const ListeningPreset({
    required this.id,
    required this.name,
    required this.intensity,
    required this.richness,
  });

  final String id;
  final String name;
  final double intensity;
  final double richness;
}

@immutable
class SoundLayerDefinition {
  const SoundLayerDefinition({
    required this.id,
    required this.name,
    required this.assetPath,
    required this.kind,
    required this.baseGain,
    this.intensityGain = 0,
    this.richnessGain = 0,
    this.pan = 0,
    this.seekOffset = Duration.zero,
    this.eventDuration = const Duration(seconds: 3),
    this.enabledByDefault = true,
  });

  final String id;
  final String name;
  final String assetPath;
  final SoundLayerKind kind;
  final double baseGain;
  final double intensityGain;
  final double richnessGain;
  final double pan;
  final Duration seekOffset;
  final Duration eventDuration;
  final bool enabledByDefault;
}

@immutable
class SoundscapeScene {
  const SoundscapeScene({
    required this.id,
    required this.name,
    required this.description,
    required this.coverAsset,
    required this.heroAsset,
    required this.layers,
    required this.defaultIntensity,
    required this.defaultRichness,
  });

  final String id;
  final String name;
  final String description;
  final String coverAsset;
  final String heroAsset;
  final List<SoundLayerDefinition> layers;
  final double defaultIntensity;
  final double defaultRichness;
}

@immutable
class SoundLayerSnapshot {
  const SoundLayerSnapshot({
    required this.definition,
    required this.enabled,
    required this.presence,
    required this.effectiveGain,
  });

  final SoundLayerDefinition definition;
  final bool enabled;
  final double presence;
  final double effectiveGain;
}
