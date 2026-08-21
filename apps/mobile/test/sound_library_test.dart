import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_mobile/data/bundled_sound_library.dart';
import 'package:soundscape_mobile/domain/sound_asset.dart';
import 'package:soundscape_mobile/domain/soundscape_catalog.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SoundLibrary library;

  setUpAll(() async {
    library = await BundledSoundLibrary().load();
  });

  test('bundled manifest is versioned and all scene references resolve', () {
    expect(library.schemaVersion, 1);
    expect(library.catalogVersion, isNotEmpty);
    expect(library.assets, hasLength(2));
    final issues = library.integrityIssues(scenes: SoundscapeCatalog.scenes);
    expect(issues.map((issue) => '${issue.code}: ${issue.message}'), isEmpty);
  });

  test('development recordings cannot silently enter a release catalog', () {
    final referencedAssetIds = {
      for (final scene in SoundscapeCatalog.scenes)
        for (final layer in scene.layers) layer.assetId,
    };
    final issues = library.releaseIssues(referencedAssetIds);

    expect(issues, hasLength(referencedAssetIds.length));
    expect(
      issues.map((issue) => issue.code),
      everyElement('not-release-eligible'),
    );
    expect(
      referencedAssetIds
          .map(library.assetById)
          .map((asset) => asset.source.provenance),
      everyElement(SoundAssetProvenance.unverified),
    );
  });

  test(
    'asset metadata keeps localized names, hashes, and playable segments',
    () {
      final water = library.assetById('open-water-development');

      expect(water.name.resolve(), '开阔水面原型录音');
      expect(water.sha256, hasLength(64));
      expect(
        water.segmentById('event-a').duration,
        const Duration(milliseconds: 3400),
      );
      expect(
        water.segmentById('texture-far').start,
        const Duration(seconds: 7),
      );
    },
  );
}
