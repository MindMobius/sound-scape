import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:file_selector/file_selector.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/sound_asset.dart';
import 'sound_asset_importer.dart';

class LocalSoundAssetImporter implements SoundAssetImporter {
  LocalSoundAssetImporter({this.directoryPathProvider});

  static const supportedExtensions = {
    'aac',
    'flac',
    'm4a',
    'mp3',
    'ogg',
    'opus',
    'wav',
  };

  final Future<String> Function()? directoryPathProvider;

  @override
  Future<ImportedSoundAsset?> pickAndImport() async {
    final selected = await openFile(
      acceptedTypeGroups: const [
        XTypeGroup(
          label: '音频',
          extensions: ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wav'],
        ),
      ],
    );
    if (selected == null) return null;
    return importFile(selected);
  }

  Future<ImportedSoundAsset> importFile(XFile selected) async {
    final extension = _extensionOf(selected.name);
    if (!supportedExtensions.contains(extension)) {
      throw FormatException('Unsupported audio file: ${selected.name}.');
    }
    final byteLength = await selected.length();
    if (byteLength <= 0) {
      throw FormatException('Audio file is empty: ${selected.name}.');
    }

    final digest = await sha256.bind(selected.openRead()).first;
    final hash = digest.toString();
    final rootPath =
        await (directoryPathProvider?.call() ??
            getApplicationSupportDirectory().then(
              (directory) => directory.path,
            ));
    final importsDirectory = Directory(
      '$rootPath${Platform.pathSeparator}imports',
    );
    await importsDirectory.create(recursive: true);
    final destination = File(
      '${importsDirectory.path}${Platform.pathSeparator}$hash.$extension',
    );
    if (!await destination.exists()) {
      final temporary = File('${destination.path}.tmp');
      if (await temporary.exists()) await temporary.delete();
      final output = temporary.openWrite();
      await for (final bytes in selected.openRead()) {
        output.add(bytes);
      }
      await output.close();
      await temporary.rename(destination.path);
    }

    final displayName = _displayNameOf(selected.name);
    return ImportedSoundAsset(
      originalFileName: selected.name,
      byteLength: byteLength,
      asset: SoundAsset(
        id: 'user.$hash',
        metadataVersion: 1,
        fileVersion: 1,
        category: SoundAssetCategory.custom,
        name: SoundLocalizedText({'zh-CN': displayName}),
        availability: SoundAssetAvailability.imported,
        releaseStatus: SoundAssetReleaseStatus.blocked,
        sha256: hash,
        source: SoundSource(
          name: '用户导入',
          provenance: SoundAssetProvenance.userProvided,
          license: SoundLicense(
            name: '用户私有素材，授权范围未知',
            redistributionAllowed: false,
          ),
        ),
        segments: [
          SoundSegment(
            id: 'main',
            path: destination.path,
            purpose: SoundSegmentPurpose.loop,
          ),
        ],
        previewSegmentId: 'main',
        tags: const ['用户素材'],
      ),
    );
  }
}

String _extensionOf(String fileName) {
  final separator = fileName.lastIndexOf('.');
  if (separator < 0 || separator == fileName.length - 1) return '';
  return fileName.substring(separator + 1).toLowerCase();
}

String _displayNameOf(String fileName) {
  final separator = fileName.lastIndexOf('.');
  return separator <= 0 ? fileName : fileName.substring(0, separator);
}
