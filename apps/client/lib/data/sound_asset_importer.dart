import '../domain/sound_asset.dart';

class ImportedSoundAsset {
  const ImportedSoundAsset({
    required this.asset,
    required this.originalFileName,
    required this.byteLength,
  });

  final SoundAsset asset;
  final String originalFileName;
  final int byteLength;
}

abstract interface class SoundAssetImporter {
  Future<ImportedSoundAsset?> pickAndImport();

  Future<bool> exists(SoundAsset asset);

  Future<void> delete(SoundAsset asset);
}
