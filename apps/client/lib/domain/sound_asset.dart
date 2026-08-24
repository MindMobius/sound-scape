import 'package:flutter/foundation.dart';

import 'soundscape_scene.dart';

enum SoundAssetCategory {
  weather,
  water,
  fire,
  wildlife,
  place,
  device,
  media,
  custom,
}

enum SoundAssetAvailability { bundled, downloadable, imported, missing }

enum SoundAssetReleaseStatus { developmentOnly, approved, blocked }

enum SoundAssetProvenance { verified, unverified, userProvided }

enum SoundSegmentPurpose { loop, texture, event, bridge, preview }

@immutable
class SoundLocalizedText {
  SoundLocalizedText(Map<String, String> values)
    : values = Map.unmodifiable(values);

  factory SoundLocalizedText.fromJson(Map<String, Object?> json) {
    return SoundLocalizedText(
      json.map((key, value) => MapEntry(key, value as String)),
    );
  }

  final Map<String, String> values;

  String resolve([String locale = 'zh-CN']) {
    return values[locale] ??
        values['zh-CN'] ??
        values['en'] ??
        values.values.firstOrNull ??
        '';
  }

  Map<String, Object?> toJson() => values;
}

@immutable
class SoundAuthor {
  const SoundAuthor({required this.name, this.url});

  factory SoundAuthor.fromJson(Map<String, Object?> json) {
    return SoundAuthor(
      name: json['name']! as String,
      url: json['url'] as String?,
    );
  }

  final String name;
  final String? url;

  Map<String, Object?> toJson() => {'name': name, if (url != null) 'url': url};
}

@immutable
class SoundLicense {
  const SoundLicense({
    required this.name,
    required this.redistributionAllowed,
    this.spdxId,
    this.url,
  });

  factory SoundLicense.fromJson(Map<String, Object?> json) {
    return SoundLicense(
      name: json['name']! as String,
      spdxId: json['spdxId'] as String?,
      url: json['url'] as String?,
      redistributionAllowed: json['redistributionAllowed']! as bool,
    );
  }

  final String name;
  final String? spdxId;
  final String? url;
  final bool redistributionAllowed;

  Map<String, Object?> toJson() => {
    'name': name,
    if (spdxId != null) 'spdxId': spdxId,
    if (url != null) 'url': url,
    'redistributionAllowed': redistributionAllowed,
  };
}

@immutable
class SoundSource {
  SoundSource({
    required this.name,
    required this.provenance,
    required this.license,
    this.url,
    this.downloadUrl,
    List<SoundAuthor> authors = const [],
  }) : authors = List.unmodifiable(authors);

  factory SoundSource.fromJson(Map<String, Object?> json) {
    return SoundSource(
      name: json['name']! as String,
      url: json['url'] as String?,
      downloadUrl: json['downloadUrl'] as String?,
      provenance: _parseProvenance(json['provenance']! as String),
      license: SoundLicense.fromJson(_map(json['license'])),
      authors: [
        for (final author in _list(json['authors']))
          SoundAuthor.fromJson(_map(author)),
      ],
    );
  }

  final String name;
  final String? url;
  final String? downloadUrl;
  final SoundAssetProvenance provenance;
  final SoundLicense license;
  final List<SoundAuthor> authors;

  Map<String, Object?> toJson() => {
    'name': name,
    if (url != null) 'url': url,
    if (downloadUrl != null) 'downloadUrl': downloadUrl,
    'provenance': _provenanceName(provenance),
    'authors': [for (final author in authors) author.toJson()],
    'license': license.toJson(),
  };
}

@immutable
class SoundSegment {
  const SoundSegment({
    required this.id,
    required this.path,
    required this.purpose,
    this.start = Duration.zero,
    this.duration,
    this.bridgeSegmentId,
  });

  factory SoundSegment.fromJson(Map<String, Object?> json) {
    final durationMs = json['durationMs'] as int?;
    return SoundSegment(
      id: json['id']! as String,
      path: json['path']! as String,
      purpose: _parseSegmentPurpose(json['purpose']! as String),
      start: Duration(milliseconds: (json['startMs'] as int?) ?? 0),
      duration: durationMs == null ? null : Duration(milliseconds: durationMs),
      bridgeSegmentId: json['bridgeSegmentId'] as String?,
    );
  }

  final String id;
  final String path;
  final SoundSegmentPurpose purpose;
  final Duration start;
  final Duration? duration;
  final String? bridgeSegmentId;

  Map<String, Object?> toJson() => {
    'id': id,
    'path': path,
    'purpose': _segmentPurposeName(purpose),
    'startMs': start.inMilliseconds,
    if (duration != null) 'durationMs': duration!.inMilliseconds,
    if (bridgeSegmentId != null) 'bridgeSegmentId': bridgeSegmentId,
  };
}

@immutable
class SoundAsset {
  SoundAsset({
    required this.id,
    required this.metadataVersion,
    required this.fileVersion,
    required this.category,
    required this.name,
    required this.availability,
    required this.releaseStatus,
    required this.sha256,
    required this.source,
    required this.segments,
    required this.previewSegmentId,
    List<String> tags = const [],
  }) : tags = List.unmodifiable(tags),
       segmentsById = Map.unmodifiable({
         for (final segment in segments) segment.id: segment,
       });

  factory SoundAsset.fromJson(Map<String, Object?> json) {
    final segments = [
      for (final segment in _list(json['segments']))
        SoundSegment.fromJson(_map(segment)),
    ];
    return SoundAsset(
      id: json['id']! as String,
      metadataVersion: json['metadataVersion']! as int,
      fileVersion: json['fileVersion']! as int,
      category: _parseCategory(json['category']! as String),
      name: SoundLocalizedText.fromJson(_map(json['name'])),
      availability: _parseAvailability(json['availability']! as String),
      releaseStatus: _parseReleaseStatus(json['releaseStatus']! as String),
      sha256: json['sha256']! as String,
      source: SoundSource.fromJson(_map(json['source'])),
      segments: segments,
      previewSegmentId: json['previewSegmentId']! as String,
      tags: [for (final tag in _list(json['tags'])) tag as String],
    );
  }

  final String id;
  final int metadataVersion;
  final int fileVersion;
  final SoundAssetCategory category;
  final SoundLocalizedText name;
  final SoundAssetAvailability availability;
  final SoundAssetReleaseStatus releaseStatus;
  final String sha256;
  final SoundSource source;
  final List<SoundSegment> segments;
  final Map<String, SoundSegment> segmentsById;
  final String previewSegmentId;
  final List<String> tags;

  SoundAsset copyWith({
    SoundAssetCategory? category,
    SoundLocalizedText? name,
    List<String>? tags,
  }) {
    return SoundAsset(
      id: id,
      metadataVersion: metadataVersion + 1,
      fileVersion: fileVersion,
      category: category ?? this.category,
      name: name ?? this.name,
      availability: availability,
      releaseStatus: releaseStatus,
      sha256: sha256,
      source: source,
      segments: segments,
      previewSegmentId: previewSegmentId,
      tags: tags ?? this.tags,
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'metadataVersion': metadataVersion,
    'fileVersion': fileVersion,
    'category': _categoryName(category),
    'name': name.toJson(),
    'tags': tags,
    'availability': _availabilityName(availability),
    'releaseStatus': _releaseStatusName(releaseStatus),
    'sha256': sha256,
    'previewSegmentId': previewSegmentId,
    'source': source.toJson(),
    'segments': [for (final segment in segments) segment.toJson()],
  };

  bool get isReleaseEligible {
    return releaseStatus == SoundAssetReleaseStatus.approved &&
        source.provenance == SoundAssetProvenance.verified &&
        source.license.redistributionAllowed &&
        (source.license.spdxId?.isNotEmpty ?? false) &&
        RegExp(r'^[a-f0-9]{64}$').hasMatch(sha256);
  }

  SoundSegment segmentById(String segmentId) {
    final segment = segmentsById[segmentId];
    if (segment == null) {
      throw StateError('Sound segment $id/$segmentId is not registered.');
    }
    return segment;
  }
}

@immutable
class SoundLibraryIssue {
  const SoundLibraryIssue({required this.code, required this.message});

  final String code;
  final String message;
}

@immutable
class SoundLibrary {
  SoundLibrary({
    required this.schemaVersion,
    required this.catalogVersion,
    required this.updatedAt,
    required List<SoundAsset> assets,
  }) : assets = List.unmodifiable(assets),
       assetsById = Map.unmodifiable({
         for (final asset in assets) asset.id: asset,
       });

  factory SoundLibrary.fromJson(Map<String, Object?> json) {
    final assets = [
      for (final asset in _list(json['assets']))
        SoundAsset.fromJson(_map(asset)),
    ];
    if (assets.map((asset) => asset.id).toSet().length != assets.length) {
      throw const FormatException('Sound asset ids must be unique.');
    }
    return SoundLibrary(
      schemaVersion: json['schemaVersion']! as int,
      catalogVersion: json['catalogVersion']! as String,
      updatedAt: DateTime.parse(json['updatedAt']! as String),
      assets: assets,
    );
  }

  final int schemaVersion;
  final String catalogVersion;
  final DateTime updatedAt;
  final List<SoundAsset> assets;
  final Map<String, SoundAsset> assetsById;

  SoundAsset assetById(String assetId) {
    final asset = assetsById[assetId];
    if (asset == null) {
      throw StateError('Sound asset $assetId is not registered.');
    }
    return asset;
  }

  List<SoundLibraryIssue> integrityIssues({
    Iterable<SoundscapeScene> scenes = const [],
  }) {
    final issues = <SoundLibraryIssue>[];
    if (schemaVersion != 1) {
      issues.add(
        SoundLibraryIssue(
          code: 'unsupported-schema',
          message: 'Unsupported sound library schema: $schemaVersion.',
        ),
      );
    }
    for (final asset in assets) {
      if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(asset.sha256)) {
        issues.add(
          SoundLibraryIssue(
            code: 'invalid-hash',
            message: '${asset.id} does not have a lowercase SHA-256 hash.',
          ),
        );
      }
      if (asset.segments.isEmpty) {
        issues.add(
          SoundLibraryIssue(
            code: 'missing-segments',
            message: '${asset.id} has no playable segments.',
          ),
        );
      }
      if (asset.segmentsById.length != asset.segments.length) {
        issues.add(
          SoundLibraryIssue(
            code: 'duplicate-segment',
            message: '${asset.id} contains duplicate segment ids.',
          ),
        );
      }
      if (!asset.segmentsById.containsKey(asset.previewSegmentId)) {
        issues.add(
          SoundLibraryIssue(
            code: 'missing-preview',
            message: '${asset.id} references a missing preview segment.',
          ),
        );
      }
      if (asset.releaseStatus == SoundAssetReleaseStatus.approved &&
          !asset.isReleaseEligible) {
        issues.add(
          SoundLibraryIssue(
            code: 'invalid-release-approval',
            message: '${asset.id} is approved without verified rights.',
          ),
        );
      }
      for (final segment in asset.segments) {
        if (segment.id.trim().isEmpty || segment.path.trim().isEmpty) {
          issues.add(
            SoundLibraryIssue(
              code: 'invalid-segment',
              message: '${asset.id} contains an incomplete segment.',
            ),
          );
        }
        if (segment.duration != null && segment.duration! <= Duration.zero) {
          issues.add(
            SoundLibraryIssue(
              code: 'invalid-duration',
              message: '${asset.id}/${segment.id} has an invalid duration.',
            ),
          );
        }
        final bridgeId = segment.bridgeSegmentId;
        if (bridgeId != null && !asset.segmentsById.containsKey(bridgeId)) {
          issues.add(
            SoundLibraryIssue(
              code: 'missing-bridge',
              message: '${asset.id}/${segment.id} references $bridgeId.',
            ),
          );
        }
      }
    }
    for (final scene in scenes) {
      for (final layer in scene.layers) {
        final asset = assetsById[layer.assetId];
        if (asset == null) {
          issues.add(
            SoundLibraryIssue(
              code: 'missing-asset',
              message: '${scene.id}/${layer.id} references ${layer.assetId}.',
            ),
          );
          continue;
        }
        for (final segmentId in layer.segmentIds) {
          final segment = asset.segmentsById[segmentId];
          if (segment == null) {
            issues.add(
              SoundLibraryIssue(
                code: 'missing-segment',
                message:
                    '${scene.id}/${layer.id} references ${asset.id}/$segmentId.',
              ),
            );
            continue;
          }
          final purposeMatches = switch (layer.kind) {
            SoundLayerKind.bed => segment.purpose == SoundSegmentPurpose.loop,
            SoundLayerKind.texture =>
              segment.purpose == SoundSegmentPurpose.texture ||
                  segment.purpose == SoundSegmentPurpose.loop,
            SoundLayerKind.event =>
              segment.purpose == SoundSegmentPurpose.event,
          };
          if (!purposeMatches) {
            issues.add(
              SoundLibraryIssue(
                code: 'segment-purpose-mismatch',
                message:
                    '${scene.id}/${layer.id} cannot use ${segment.purpose.name}.',
              ),
            );
          }
          if (layer.kind == SoundLayerKind.event && segment.duration == null) {
            issues.add(
              SoundLibraryIssue(
                code: 'missing-event-duration',
                message: '${asset.id}/${segment.id} needs a duration.',
              ),
            );
          }
        }
      }
    }
    return List.unmodifiable(issues);
  }

  List<SoundLibraryIssue> releaseIssues(Iterable<String> assetIds) {
    return List.unmodifiable([
      for (final assetId in assetIds)
        if (!assetById(assetId).isReleaseEligible)
          SoundLibraryIssue(
            code: 'not-release-eligible',
            message: '$assetId is not approved for redistribution.',
          ),
    ]);
  }
}

Map<String, Object?> _map(Object? value) {
  return (value! as Map<Object?, Object?>).cast<String, Object?>();
}

List<Object?> _list(Object? value) => (value! as List<Object?>);

SoundAssetCategory _parseCategory(String value) => switch (value) {
  'weather' => SoundAssetCategory.weather,
  'water' => SoundAssetCategory.water,
  'fire' => SoundAssetCategory.fire,
  'wildlife' => SoundAssetCategory.wildlife,
  'place' => SoundAssetCategory.place,
  'device' => SoundAssetCategory.device,
  'media' => SoundAssetCategory.media,
  'custom' => SoundAssetCategory.custom,
  _ => throw FormatException('Unknown sound asset category: $value.'),
};

SoundAssetAvailability _parseAvailability(String value) => switch (value) {
  'bundled' => SoundAssetAvailability.bundled,
  'downloadable' => SoundAssetAvailability.downloadable,
  'imported' => SoundAssetAvailability.imported,
  'missing' => SoundAssetAvailability.missing,
  _ => throw FormatException('Unknown sound asset availability: $value.'),
};

SoundAssetReleaseStatus _parseReleaseStatus(String value) => switch (value) {
  'development-only' => SoundAssetReleaseStatus.developmentOnly,
  'approved' => SoundAssetReleaseStatus.approved,
  'blocked' => SoundAssetReleaseStatus.blocked,
  _ => throw FormatException('Unknown sound asset release status: $value.'),
};

SoundAssetProvenance _parseProvenance(String value) => switch (value) {
  'verified' => SoundAssetProvenance.verified,
  'unverified' => SoundAssetProvenance.unverified,
  'user-provided' => SoundAssetProvenance.userProvided,
  _ => throw FormatException('Unknown sound asset provenance: $value.'),
};

SoundSegmentPurpose _parseSegmentPurpose(String value) => switch (value) {
  'loop' => SoundSegmentPurpose.loop,
  'texture' => SoundSegmentPurpose.texture,
  'event' => SoundSegmentPurpose.event,
  'bridge' => SoundSegmentPurpose.bridge,
  'preview' => SoundSegmentPurpose.preview,
  _ => throw FormatException('Unknown sound segment purpose: $value.'),
};

String _categoryName(SoundAssetCategory value) => switch (value) {
  SoundAssetCategory.weather => 'weather',
  SoundAssetCategory.water => 'water',
  SoundAssetCategory.fire => 'fire',
  SoundAssetCategory.wildlife => 'wildlife',
  SoundAssetCategory.place => 'place',
  SoundAssetCategory.device => 'device',
  SoundAssetCategory.media => 'media',
  SoundAssetCategory.custom => 'custom',
};

String _availabilityName(SoundAssetAvailability value) => switch (value) {
  SoundAssetAvailability.bundled => 'bundled',
  SoundAssetAvailability.downloadable => 'downloadable',
  SoundAssetAvailability.imported => 'imported',
  SoundAssetAvailability.missing => 'missing',
};

String _releaseStatusName(SoundAssetReleaseStatus value) => switch (value) {
  SoundAssetReleaseStatus.developmentOnly => 'development-only',
  SoundAssetReleaseStatus.approved => 'approved',
  SoundAssetReleaseStatus.blocked => 'blocked',
};

String _provenanceName(SoundAssetProvenance value) => switch (value) {
  SoundAssetProvenance.verified => 'verified',
  SoundAssetProvenance.unverified => 'unverified',
  SoundAssetProvenance.userProvided => 'user-provided',
};

String _segmentPurposeName(SoundSegmentPurpose value) => switch (value) {
  SoundSegmentPurpose.loop => 'loop',
  SoundSegmentPurpose.texture => 'texture',
  SoundSegmentPurpose.event => 'event',
  SoundSegmentPurpose.bridge => 'bridge',
  SoundSegmentPurpose.preview => 'preview',
};
