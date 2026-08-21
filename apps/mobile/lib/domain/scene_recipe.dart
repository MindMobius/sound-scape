import 'package:flutter/foundation.dart';

import 'soundscape_scene.dart';

@immutable
class SceneRecipe {
  SceneRecipe({
    required this.schemaVersion,
    required this.sceneId,
    required this.seed,
    required this.intensity,
    required this.richness,
    required List<SoundLayerDefinition> layers,
  }) : layers = List.unmodifiable(layers);

  factory SceneRecipe.fromScene(SoundscapeScene scene) {
    return SceneRecipe(
      schemaVersion: scene.schemaVersion,
      sceneId: scene.id,
      seed: scene.seed,
      intensity: scene.defaultIntensity,
      richness: scene.defaultRichness,
      layers: scene.layers,
    );
  }

  factory SceneRecipe.fromJson(Map<String, Object?> json) {
    final macros = _map(json['macros']);
    final recipe = SceneRecipe(
      schemaVersion: json['schemaVersion']! as int,
      sceneId: json['sceneId']! as String,
      seed: json['seed']! as int,
      intensity: (macros['intensity']! as num).toDouble(),
      richness: (macros['richness']! as num).toDouble(),
      layers: [
        for (final layer in _list(json['layers'])) _layerFromJson(_map(layer)),
      ],
    );
    final issues = recipe.validationIssues();
    if (issues.isNotEmpty) throw FormatException(issues.join('\n'));
    return recipe;
  }

  final int schemaVersion;
  final String sceneId;
  final int seed;
  final double intensity;
  final double richness;
  final List<SoundLayerDefinition> layers;

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'sceneId': sceneId,
    'seed': seed,
    'macros': {'intensity': intensity, 'richness': richness},
    'layers': [for (final layer in layers) _layerToJson(layer)],
  };

  List<String> validationIssues() {
    final issues = <String>[];
    if (schemaVersion != 1) issues.add('Unsupported recipe schema.');
    if (sceneId.trim().isEmpty) issues.add('sceneId is required.');
    if (seed <= 0) issues.add('seed must be positive.');
    if (intensity < 0 || intensity > 1) {
      issues.add('intensity must be between 0 and 1.');
    }
    if (richness < 0 || richness > 1) {
      issues.add('richness must be between 0 and 1.');
    }
    if (layers.isEmpty) issues.add('At least one layer is required.');
    if (layers.map((layer) => layer.id).toSet().length != layers.length) {
      issues.add('Layer ids must be unique.');
    }
    for (final layer in layers) {
      if (layer.id.trim().isEmpty || layer.assetId.trim().isEmpty) {
        issues.add('Every layer requires an id and assetId.');
      }
      if (layer.segmentIds.isEmpty ||
          layer.segmentIds.toSet().length != layer.segmentIds.length) {
        issues.add('${layer.id} requires unique segment ids.');
      }
      if (layer.baseGain < 0 ||
          layer.baseGain > 1 ||
          layer.intensityGain < 0 ||
          layer.intensityGain > 1 ||
          layer.richnessGain < 0 ||
          layer.richnessGain > 1 ||
          layer.pan < -1 ||
          layer.pan > 1) {
        issues.add('${layer.id} contains an out-of-range mix value.');
      }
      if (layer.eventPolicy.maximumSilence < layer.eventPolicy.minimumSilence) {
        issues.add('${layer.id} has an inverted silence range.');
      }
      if (layer.dynamics.maximumChangeInterval <
              layer.dynamics.minimumChangeInterval ||
          layer.dynamics.maximumTransition < layer.dynamics.minimumTransition ||
          layer.dynamics.gainVariation < 0 ||
          layer.dynamics.gainVariation > 0.95 ||
          layer.dynamics.panVariation < 0 ||
          layer.dynamics.panVariation > 1) {
        issues.add('${layer.id} contains invalid dynamics.');
      }
    }
    return List.unmodifiable(issues);
  }

  SoundscapeScene applyTo(SoundscapeScene metadata) {
    if (metadata.id != sceneId) {
      throw ArgumentError.value(
        metadata.id,
        'metadata.id',
        'must match recipe sceneId $sceneId',
      );
    }
    return SoundscapeScene(
      schemaVersion: schemaVersion,
      seed: seed,
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      coverAsset: metadata.coverAsset,
      heroAsset: metadata.heroAsset,
      layers: layers,
      defaultIntensity: intensity,
      defaultRichness: richness,
    );
  }
}

SoundLayerDefinition _layerFromJson(Map<String, Object?> json) {
  final event = _map(json['eventPolicy']);
  final dynamics = _map(json['dynamics']);
  return SoundLayerDefinition(
    id: json['id']! as String,
    name: json['name']! as String,
    assetId: json['assetId']! as String,
    segmentIds: [for (final id in _list(json['segmentIds'])) id as String],
    kind: switch (json['kind']! as String) {
      'bed' => SoundLayerKind.bed,
      'texture' => SoundLayerKind.texture,
      'event' => SoundLayerKind.event,
      final value => throw FormatException('Unknown sound layer kind: $value.'),
    },
    baseGain: (json['baseGain']! as num).toDouble(),
    intensityGain: (json['intensityGain']! as num).toDouble(),
    richnessGain: (json['richnessGain']! as num).toDouble(),
    pan: (json['pan']! as num).toDouble(),
    enabledByDefault: json['enabledByDefault']! as bool,
    eventPolicy: SoundEventPolicy(
      minimumSilence: Duration(milliseconds: event['minimumSilenceMs']! as int),
      maximumSilence: Duration(milliseconds: event['maximumSilenceMs']! as int),
      scheduleLead: Duration(milliseconds: event['scheduleLeadMs']! as int),
      noImmediateRepeat: event['noImmediateRepeat']! as bool,
    ),
    dynamics: SoundLayerDynamics(
      gainVariation: (dynamics['gainVariation']! as num).toDouble(),
      panVariation: (dynamics['panVariation']! as num).toDouble(),
      minimumChangeInterval: Duration(
        milliseconds: dynamics['minimumChangeIntervalMs']! as int,
      ),
      maximumChangeInterval: Duration(
        milliseconds: dynamics['maximumChangeIntervalMs']! as int,
      ),
      minimumTransition: Duration(
        milliseconds: dynamics['minimumTransitionMs']! as int,
      ),
      maximumTransition: Duration(
        milliseconds: dynamics['maximumTransitionMs']! as int,
      ),
    ),
  );
}

Map<String, Object?> _layerToJson(SoundLayerDefinition layer) => {
  'id': layer.id,
  'name': layer.name,
  'assetId': layer.assetId,
  'segmentIds': layer.segmentIds,
  'kind': layer.kind.name,
  'baseGain': layer.baseGain,
  'intensityGain': layer.intensityGain,
  'richnessGain': layer.richnessGain,
  'pan': layer.pan,
  'enabledByDefault': layer.enabledByDefault,
  'eventPolicy': {
    'minimumSilenceMs': layer.eventPolicy.minimumSilence.inMilliseconds,
    'maximumSilenceMs': layer.eventPolicy.maximumSilence.inMilliseconds,
    'scheduleLeadMs': layer.eventPolicy.scheduleLead.inMilliseconds,
    'noImmediateRepeat': layer.eventPolicy.noImmediateRepeat,
  },
  'dynamics': {
    'gainVariation': layer.dynamics.gainVariation,
    'panVariation': layer.dynamics.panVariation,
    'minimumChangeIntervalMs':
        layer.dynamics.minimumChangeInterval.inMilliseconds,
    'maximumChangeIntervalMs':
        layer.dynamics.maximumChangeInterval.inMilliseconds,
    'minimumTransitionMs': layer.dynamics.minimumTransition.inMilliseconds,
    'maximumTransitionMs': layer.dynamics.maximumTransition.inMilliseconds,
  },
};

Map<String, Object?> _map(Object? value) {
  return (value! as Map<Object?, Object?>).cast<String, Object?>();
}

List<Object?> _list(Object? value) => value! as List<Object?>;
