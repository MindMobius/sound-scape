import '../domain/sound_asset.dart';
import 'sound_asset_importer.dart';

class LocalSoundAssetImporter implements SoundAssetImporter {
  LocalSoundAssetImporter({Future<String> Function()? directoryPathProvider});

  @override
  Future<ImportedSoundAsset?> pickAndImport() {
    throw UnsupportedError(
      'Persistent user audio import is not available on this platform.',
    );
  }

  @override
  Future<bool> exists(SoundAsset asset) async => false;

  @override
  Future<void> delete(SoundAsset asset) async {}
}
