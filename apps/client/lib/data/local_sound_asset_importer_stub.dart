import 'sound_asset_importer.dart';

class LocalSoundAssetImporter implements SoundAssetImporter {
  LocalSoundAssetImporter({Future<String> Function()? directoryPathProvider});

  @override
  Future<ImportedSoundAsset?> pickAndImport() {
    throw UnsupportedError(
      'Persistent user audio import is not available on this platform.',
    );
  }
}
