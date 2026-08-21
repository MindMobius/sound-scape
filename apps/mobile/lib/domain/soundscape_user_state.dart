import 'package:flutter/foundation.dart';

@immutable
class SceneMixState {
  SceneMixState({
    required this.intensity,
    required this.richness,
    Map<String, double> layerPresence = const {},
    Set<String> disabledLayerIds = const {},
  }) : layerPresence = Map.unmodifiable(layerPresence),
       disabledLayerIds = Set.unmodifiable(disabledLayerIds);

  factory SceneMixState.fromJson(Map<String, Object?> json) {
    final rawPresence = _map(json['layerPresence']);
    return SceneMixState(
      intensity: (json['intensity']! as num).toDouble(),
      richness: (json['richness']! as num).toDouble(),
      layerPresence: rawPresence.map(
        (key, value) => MapEntry(key, (value! as num).toDouble()),
      ),
      disabledLayerIds: {
        for (final layerId in _list(json['disabledLayerIds']))
          layerId as String,
      },
    );
  }

  final double intensity;
  final double richness;
  final Map<String, double> layerPresence;
  final Set<String> disabledLayerIds;

  Map<String, Object?> toJson() => {
    'intensity': intensity,
    'richness': richness,
    'layerPresence': layerPresence,
    'disabledLayerIds': disabledLayerIds.toList()..sort(),
  };
}

@immutable
class SavedSoundscapePreset {
  const SavedSoundscapePreset({
    required this.id,
    required this.name,
    required this.sceneId,
    required this.createdAt,
    required this.mix,
  });

  factory SavedSoundscapePreset.fromJson(Map<String, Object?> json) {
    return SavedSoundscapePreset(
      id: json['id']! as String,
      name: json['name']! as String,
      sceneId: json['sceneId']! as String,
      createdAt: DateTime.parse(json['createdAt']! as String),
      mix: SceneMixState.fromJson(_map(json['mix'])),
    );
  }

  final String id;
  final String name;
  final String sceneId;
  final DateTime createdAt;
  final SceneMixState mix;

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'sceneId': sceneId,
    'createdAt': createdAt.toIso8601String(),
    'mix': mix.toJson(),
  };
}

@immutable
class SoundscapeUserState {
  SoundscapeUserState({
    required this.schemaVersion,
    required this.selectedSceneId,
    required this.masterVolume,
    Map<String, SceneMixState> scenes = const {},
    Set<String> favoriteSceneIds = const {},
    List<SavedSoundscapePreset> savedPresets = const [],
  }) : scenes = Map.unmodifiable(scenes),
       favoriteSceneIds = Set.unmodifiable(favoriteSceneIds),
       savedPresets = List.unmodifiable(savedPresets);

  factory SoundscapeUserState.fromJson(Map<String, Object?> json) {
    final schemaVersion = json['schemaVersion']! as int;
    if (schemaVersion != currentSchemaVersion) {
      throw FormatException(
        'Unsupported soundscape state schema: $schemaVersion.',
      );
    }
    return SoundscapeUserState(
      schemaVersion: schemaVersion,
      selectedSceneId: json['selectedSceneId']! as String,
      masterVolume: (json['masterVolume']! as num).toDouble(),
      scenes: _map(json['scenes']).map(
        (sceneId, value) =>
            MapEntry(sceneId, SceneMixState.fromJson(_map(value))),
      ),
      favoriteSceneIds: {
        for (final sceneId in _list(json['favoriteSceneIds']))
          sceneId as String,
      },
      savedPresets: [
        for (final preset in _list(json['savedPresets']))
          SavedSoundscapePreset.fromJson(_map(preset)),
      ],
    );
  }

  static const currentSchemaVersion = 1;

  final int schemaVersion;
  final String selectedSceneId;
  final double masterVolume;
  final Map<String, SceneMixState> scenes;
  final Set<String> favoriteSceneIds;
  final List<SavedSoundscapePreset> savedPresets;

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'selectedSceneId': selectedSceneId,
    'masterVolume': masterVolume,
    'scenes': scenes.map((key, value) => MapEntry(key, value.toJson())),
    'favoriteSceneIds': favoriteSceneIds.toList()..sort(),
    'savedPresets': [for (final preset in savedPresets) preset.toJson()],
  };
}

Map<String, Object?> _map(Object? value) {
  if (value == null) return const {};
  return (value as Map<Object?, Object?>).cast<String, Object?>();
}

List<Object?> _list(Object? value) => (value as List<Object?>?) ?? const [];
