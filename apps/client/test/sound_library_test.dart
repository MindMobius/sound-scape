import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/data/bundled_sound_library.dart';
import 'package:soundscape_client/domain/sound_asset.dart';
import 'package:soundscape_client/domain/soundscape_catalog.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SoundLibrary library;

  setUpAll(() async {
    library = await BundledSoundLibrary().load();
  });

  test('bundled manifest is versioned and all scene references resolve', () {
    expect(library.schemaVersion, 1);
    expect(library.catalogVersion, isNotEmpty);
    expect(library.assets, hasLength(23));
    final issues = library.integrityIssues(scenes: SoundscapeCatalog.scenes);
    expect(issues.map((issue) => '${issue.code}: ${issue.message}'), isEmpty);
  });

  test('every bundled recording is release eligible with verified rights', () {
    final referencedAssetIds = {
      for (final scene in SoundscapeCatalog.scenes)
        for (final layer in scene.layers) layer.assetId,
    };
    final issues = library.releaseIssues(referencedAssetIds);

    expect(issues, isEmpty);
    expect(
      referencedAssetIds
          .map(library.assetById)
          .map((asset) => asset.source.provenance),
      everyElement(SoundAssetProvenance.verified),
    );
    expect(
      library.assets.map((asset) => asset.isReleaseEligible),
      everyElement(isTrue),
    );
  });

  test(
    'asset metadata keeps localized names, hashes, and playable segments',
    () {
      final water = library.assetById('ambie.underwater.v1');

      expect(water.name.resolve(), '水下回响');
      expect(water.sha256, hasLength(64));
      expect(
        water.segmentById('event-a').duration,
        const Duration(milliseconds: 4500),
      );
      expect(water.segmentById('event-c').start, const Duration(seconds: 16));

      final forestBirds = library.assetById('freesound.forest-birds.v1');
      expect(
        forestBirds.source.downloadUrl,
        'https://cdn.freesound.org/previews/723/723913_2008500-hq.mp3',
      );
    },
  );

  test('rain cabin layers use independently sourced CC0 details', () {
    final rainCabin = SoundscapeCatalog.byId('rain-cabin');
    final layerAssetIds = {for (final layer in rainCabin.layers) layer.assetId};

    expect(layerAssetIds, contains('freesound.rain-window.v1'));
    expect(layerAssetIds, contains('freesound.campfire.v1'));
    expect(layerAssetIds, contains('freesound.river.v1'));
    expect(
      library.assetById('freesound.rain-window.v1').source.url,
      'https://freesound.org/people/Nickisawsome74/sounds/669621/',
    );
  });
}
