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
class SoundEventPolicy {
  const SoundEventPolicy({
    this.minimumSilence = const Duration(seconds: 6),
    this.maximumSilence = const Duration(seconds: 16),
    this.scheduleLead = const Duration(milliseconds: 240),
    this.noImmediateRepeat = true,
  });

  final Duration minimumSilence;
  final Duration maximumSilence;
  final Duration scheduleLead;
  final bool noImmediateRepeat;
}

@immutable
class SoundLayerDynamics {
  const SoundLayerDynamics({
    this.gainVariation = 0.14,
    this.panVariation = 0.18,
    this.minimumChangeInterval = const Duration(seconds: 6),
    this.maximumChangeInterval = const Duration(seconds: 11),
    this.minimumTransition = const Duration(seconds: 4),
    this.maximumTransition = const Duration(seconds: 8),
  });

  final double gainVariation;
  final double panVariation;
  final Duration minimumChangeInterval;
  final Duration maximumChangeInterval;
  final Duration minimumTransition;
  final Duration maximumTransition;
}

@immutable
class SoundLayerDefinition {
  const SoundLayerDefinition({
    required this.id,
    required this.name,
    required this.assetId,
    required this.segmentIds,
    required this.kind,
    required this.baseGain,
    this.intensityGain = 0,
    this.richnessGain = 0,
    this.pan = 0,
    this.eventPolicy = const SoundEventPolicy(),
    this.dynamics = const SoundLayerDynamics(),
    this.enabledByDefault = true,
  });

  final String id;
  final String name;
  final String assetId;
  final List<String> segmentIds;
  final SoundLayerKind kind;
  final double baseGain;
  final double intensityGain;
  final double richnessGain;
  final double pan;
  final SoundEventPolicy eventPolicy;
  final SoundLayerDynamics dynamics;
  final bool enabledByDefault;
}

@immutable
class SoundscapeScene {
  const SoundscapeScene({
    required this.schemaVersion,
    required this.seed,
    required this.id,
    required this.name,
    required this.description,
    required this.coverAsset,
    required this.heroAsset,
    required this.layers,
    required this.defaultIntensity,
    required this.defaultRichness,
  });

  final int schemaVersion;
  final int seed;
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
