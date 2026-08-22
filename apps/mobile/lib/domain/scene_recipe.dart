import 'package:flutter/foundation.dart';

import 'generated/scene_recipe_contract.g.dart';
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
    _expectKeys(json, _recipeKeys, 'recipe');
    final macros = _map(json['macros'], 'macros');
    _expectKeys(macros, _macroKeys, 'macros');
    final layerValues = _list(json['layers'], 'layers');
    final layers = <SoundLayerDefinition>[];
    for (var index = 0; index < layerValues.length; index++) {
      layers.add(_layerFromJson(_map(layerValues[index], 'layers[$index]')));
    }
    final recipe = SceneRecipe(
      schemaVersion: _integer(json['schemaVersion'], 'schemaVersion'),
      sceneId: _string(json['sceneId'], 'sceneId'),
      seed: _integer(json['seed'], 'seed'),
      intensity: _number(macros['intensity'], 'macros.intensity'),
      richness: _number(macros['richness'], 'macros.richness'),
      layers: layers,
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
    if (schemaVersion != sceneRecipeSchemaVersion) {
      issues.add('Unsupported recipe schema.');
    }
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
      if (layer.id.trim().isEmpty ||
          layer.name.trim().isEmpty ||
          layer.assetId.trim().isEmpty) {
        issues.add('Every layer requires an id, name, and assetId.');
      }
      if (layer.segmentIds.isEmpty ||
          layer.segmentIds.any((id) => id.trim().isEmpty) ||
          layer.segmentIds.toSet().length != layer.segmentIds.length) {
        issues.add('${layer.id} requires non-empty, unique segment ids.');
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
      if (layer.eventPolicy.minimumSilence.isNegative ||
          layer.eventPolicy.maximumSilence.isNegative ||
          layer.eventPolicy.scheduleLead.isNegative ||
          layer.eventPolicy.maximumSilence < layer.eventPolicy.minimumSilence) {
        issues.add('${layer.id} has an inverted silence range.');
      }
      if (layer.dynamics.maximumChangeInterval <
              layer.dynamics.minimumChangeInterval ||
          layer.dynamics.maximumTransition < layer.dynamics.minimumTransition ||
          layer.dynamics.minimumChangeInterval.isNegative ||
          layer.dynamics.maximumChangeInterval.isNegative ||
          layer.dynamics.minimumTransition.isNegative ||
          layer.dynamics.maximumTransition.isNegative ||
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
  _expectKeys(json, _layerKeys, 'layer');
  final event = _map(json['eventPolicy'], 'layer.eventPolicy');
  final dynamics = _map(json['dynamics'], 'layer.dynamics');
  _expectKeys(event, _eventPolicyKeys, 'layer.eventPolicy');
  _expectKeys(dynamics, _dynamicsKeys, 'layer.dynamics');
  final segmentValues = _list(json['segmentIds'], 'layer.segmentIds');
  final segmentIds = <String>[];
  for (var index = 0; index < segmentValues.length; index++) {
    segmentIds.add(_string(segmentValues[index], 'layer.segmentIds[$index]'));
  }
  final kind = _string(json['kind'], 'layer.kind');
  return SoundLayerDefinition(
    id: _string(json['id'], 'layer.id'),
    name: _string(json['name'], 'layer.name'),
    assetId: _string(json['assetId'], 'layer.assetId'),
    segmentIds: segmentIds,
    kind: switch (kind) {
      'bed' => SoundLayerKind.bed,
      'texture' => SoundLayerKind.texture,
      'event' => SoundLayerKind.event,
      final value => throw FormatException('Unknown sound layer kind: $value.'),
    },
    baseGain: _number(json['baseGain'], 'layer.baseGain'),
    intensityGain: _number(json['intensityGain'], 'layer.intensityGain'),
    richnessGain: _number(json['richnessGain'], 'layer.richnessGain'),
    pan: _number(json['pan'], 'layer.pan'),
    enabledByDefault: _boolean(
      json['enabledByDefault'],
      'layer.enabledByDefault',
    ),
    eventPolicy: SoundEventPolicy(
      minimumSilence: Duration(
        milliseconds: _integer(
          event['minimumSilenceMs'],
          'layer.eventPolicy.minimumSilenceMs',
        ),
      ),
      maximumSilence: Duration(
        milliseconds: _integer(
          event['maximumSilenceMs'],
          'layer.eventPolicy.maximumSilenceMs',
        ),
      ),
      scheduleLead: Duration(
        milliseconds: _integer(
          event['scheduleLeadMs'],
          'layer.eventPolicy.scheduleLeadMs',
        ),
      ),
      noImmediateRepeat: _boolean(
        event['noImmediateRepeat'],
        'layer.eventPolicy.noImmediateRepeat',
      ),
    ),
    dynamics: SoundLayerDynamics(
      gainVariation: _number(
        dynamics['gainVariation'],
        'layer.dynamics.gainVariation',
      ),
      panVariation: _number(
        dynamics['panVariation'],
        'layer.dynamics.panVariation',
      ),
      minimumChangeInterval: Duration(
        milliseconds: _integer(
          dynamics['minimumChangeIntervalMs'],
          'layer.dynamics.minimumChangeIntervalMs',
        ),
      ),
      maximumChangeInterval: Duration(
        milliseconds: _integer(
          dynamics['maximumChangeIntervalMs'],
          'layer.dynamics.maximumChangeIntervalMs',
        ),
      ),
      minimumTransition: Duration(
        milliseconds: _integer(
          dynamics['minimumTransitionMs'],
          'layer.dynamics.minimumTransitionMs',
        ),
      ),
      maximumTransition: Duration(
        milliseconds: _integer(
          dynamics['maximumTransitionMs'],
          'layer.dynamics.maximumTransitionMs',
        ),
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

const _recipeKeys = {'schemaVersion', 'sceneId', 'seed', 'macros', 'layers'};
const _macroKeys = {'intensity', 'richness'};
const _layerKeys = {
  'id',
  'name',
  'assetId',
  'segmentIds',
  'kind',
  'baseGain',
  'intensityGain',
  'richnessGain',
  'pan',
  'enabledByDefault',
  'eventPolicy',
  'dynamics',
};
const _eventPolicyKeys = {
  'minimumSilenceMs',
  'maximumSilenceMs',
  'scheduleLeadMs',
  'noImmediateRepeat',
};
const _dynamicsKeys = {
  'gainVariation',
  'panVariation',
  'minimumChangeIntervalMs',
  'maximumChangeIntervalMs',
  'minimumTransitionMs',
  'maximumTransitionMs',
};

void _expectKeys(
  Map<String, Object?> value,
  Set<String> expected,
  String label,
) {
  final actual = value.keys.toSet();
  final missing = expected.difference(actual);
  final unknown = actual.difference(expected);
  if (missing.isEmpty && unknown.isEmpty) return;
  throw FormatException(
    '$label has invalid keys; missing=${missing.join(',')}, '
    'unknown=${unknown.join(',')}.',
  );
}

Map<String, Object?> _map(Object? value, String label) {
  if (value is! Map<Object?, Object?>) {
    throw FormatException('$label must be an object.');
  }
  try {
    return value.cast<String, Object?>();
  } on TypeError {
    throw FormatException('$label keys must be strings.');
  }
}

List<Object?> _list(Object? value, String label) {
  if (value is! List<Object?>) {
    throw FormatException('$label must be an array.');
  }
  return value;
}

String _string(Object? value, String label) {
  if (value is! String) throw FormatException('$label must be a string.');
  return value;
}

int _integer(Object? value, String label) {
  if (value is! int) throw FormatException('$label must be an integer.');
  return value;
}

double _number(Object? value, String label) {
  if (value is! num) throw FormatException('$label must be a number.');
  return value.toDouble();
}

bool _boolean(Object? value, String label) {
  if (value is! bool) throw FormatException('$label must be a boolean.');
  return value;
}
