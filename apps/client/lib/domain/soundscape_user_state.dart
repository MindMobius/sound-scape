import 'package:flutter/foundation.dart';

import 'sound_asset.dart';
import 'soundscape_scene.dart';

@immutable
class SceneMixState {
  SceneMixState({
    required this.intensity,
    required this.richness,
    Map<String, double> layerPresence = const {},
    Set<String> disabledLayerIds = const {},
    List<String> addedAssetIds = const [],
    Map<String, SoundCharacter> layerCharacters = const {},
  }) : layerPresence = Map.unmodifiable(layerPresence),
       disabledLayerIds = Set.unmodifiable(disabledLayerIds),
       addedAssetIds = List.unmodifiable(addedAssetIds),
       layerCharacters = Map.unmodifiable(layerCharacters);

  factory SceneMixState.fromJson(Map<String, Object?> json) {
    final rawPresence = _map(json['layerPresence']);
    final rawCharacters = _map(json['layerCharacters']);
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
      addedAssetIds: [
        for (final assetId in _list(json['addedAssetIds'])) assetId as String,
      ],
      layerCharacters: rawCharacters.map(
        (layerId, value) =>
            MapEntry(layerId, _parseSoundCharacter(value! as String)),
      ),
    );
  }

  final double intensity;
  final double richness;
  final Map<String, double> layerPresence;
  final Set<String> disabledLayerIds;
  final List<String> addedAssetIds;
  final Map<String, SoundCharacter> layerCharacters;

  SceneMixState copyWith({
    double? intensity,
    double? richness,
    Map<String, double>? layerPresence,
    Set<String>? disabledLayerIds,
    List<String>? addedAssetIds,
    Map<String, SoundCharacter>? layerCharacters,
  }) {
    return SceneMixState(
      intensity: intensity ?? this.intensity,
      richness: richness ?? this.richness,
      layerPresence: layerPresence ?? this.layerPresence,
      disabledLayerIds: disabledLayerIds ?? this.disabledLayerIds,
      addedAssetIds: addedAssetIds ?? this.addedAssetIds,
      layerCharacters: layerCharacters ?? this.layerCharacters,
    );
  }

  Map<String, Object?> toJson() => {
    'intensity': intensity,
    'richness': richness,
    'layerPresence': layerPresence,
    'disabledLayerIds': disabledLayerIds.toList()..sort(),
    'addedAssetIds': addedAssetIds,
    'layerCharacters': layerCharacters.map(
      (layerId, character) => MapEntry(layerId, character.name),
    ),
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

  SavedSoundscapePreset copyWith({String? name, SceneMixState? mix}) {
    return SavedSoundscapePreset(
      id: id,
      name: name ?? this.name,
      sceneId: sceneId,
      createdAt: createdAt,
      mix: mix ?? this.mix,
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'sceneId': sceneId,
    'createdAt': createdAt.toIso8601String(),
    'mix': mix.toJson(),
  };
}

@immutable
class ImportedSoundRecord {
  const ImportedSoundRecord({
    required this.asset,
    required this.originalFileName,
    required this.byteLength,
    required this.importedAt,
  });

  factory ImportedSoundRecord.fromJson(Map<String, Object?> json) {
    return ImportedSoundRecord(
      asset: SoundAsset.fromJson(_map(json['asset'])),
      originalFileName: json['originalFileName']! as String,
      byteLength: json['byteLength']! as int,
      importedAt: DateTime.parse(json['importedAt']! as String),
    );
  }

  final SoundAsset asset;
  final String originalFileName;
  final int byteLength;
  final DateTime importedAt;

  ImportedSoundRecord copyWith({SoundAsset? asset}) {
    return ImportedSoundRecord(
      asset: asset ?? this.asset,
      originalFileName: originalFileName,
      byteLength: byteLength,
      importedAt: importedAt,
    );
  }

  Map<String, Object?> toJson() => {
    'asset': asset.toJson(),
    'originalFileName': originalFileName,
    'byteLength': byteLength,
    'importedAt': importedAt.toIso8601String(),
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
    List<ImportedSoundRecord> importedSounds = const [],
  }) : scenes = Map.unmodifiable(scenes),
       favoriteSceneIds = Set.unmodifiable(favoriteSceneIds),
       savedPresets = List.unmodifiable(savedPresets),
       importedSounds = List.unmodifiable(importedSounds);

  factory SoundscapeUserState.fromJson(Map<String, Object?> json) {
    final schemaVersion = json['schemaVersion']! as int;
    if (schemaVersion != 1 && schemaVersion != currentSchemaVersion) {
      throw FormatException(
        'Unsupported soundscape state schema: $schemaVersion.',
      );
    }
    return SoundscapeUserState(
      schemaVersion: currentSchemaVersion,
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
      importedSounds: [
        for (final sound in _list(json['importedSounds']))
          ImportedSoundRecord.fromJson(_map(sound)),
      ],
    );
  }

  static const currentSchemaVersion = 2;

  final int schemaVersion;
  final String selectedSceneId;
  final double masterVolume;
  final Map<String, SceneMixState> scenes;
  final Set<String> favoriteSceneIds;
  final List<SavedSoundscapePreset> savedPresets;
  final List<ImportedSoundRecord> importedSounds;

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'selectedSceneId': selectedSceneId,
    'masterVolume': masterVolume,
    'scenes': scenes.map((key, value) => MapEntry(key, value.toJson())),
    'favoriteSceneIds': favoriteSceneIds.toList()..sort(),
    'savedPresets': [for (final preset in savedPresets) preset.toJson()],
    'importedSounds': [for (final sound in importedSounds) sound.toJson()],
  };
}

Map<String, Object?> _map(Object? value) {
  if (value == null) return const {};
  return (value as Map<Object?, Object?>).cast<String, Object?>();
}

List<Object?> _list(Object? value) => (value as List<Object?>?) ?? const [];

SoundCharacter _parseSoundCharacter(String value) {
  return SoundCharacter.values.firstWhere(
    (candidate) => candidate.name == value,
    orElse: () => SoundCharacter.natural,
  );
}
