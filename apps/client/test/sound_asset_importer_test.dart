import 'dart:io';

import 'package:file_selector/file_selector.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/data/local_sound_asset_importer_io.dart';
import 'package:soundscape_client/domain/sound_asset.dart';

void main() {
  test(
    'user audio is content-addressed, deduplicated, and non-releasable',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'soundscape-import-test-',
      );
      addTearDown(() async {
        if (await directory.exists()) await directory.delete(recursive: true);
      });
      final source = File(
        '${directory.path}${Platform.pathSeparator}quiet-rain.wav',
      );
      await source.writeAsBytes(
        List<int>.generate(2048, (index) => index % 251),
      );
      final importer = LocalSoundAssetImporter(
        directoryPathProvider: () async => directory.path,
      );

      final first = await importer.importFile(XFile(source.path));
      final second = await importer.importFile(XFile(source.path));

      expect(first.asset.id, second.asset.id);
      expect(first.asset.sha256, hasLength(64));
      expect(first.asset.availability, SoundAssetAvailability.imported);
      expect(first.asset.source.provenance, SoundAssetProvenance.userProvided);
      expect(first.asset.isReleaseEligible, isFalse);
      expect(
        first.asset.segmentById('main').path,
        second.asset.segmentById('main').path,
      );
      expect(await File(first.asset.segmentById('main').path).exists(), isTrue);
      expect(await importer.exists(first.asset), isTrue);

      await importer.delete(first.asset);

      expect(await importer.exists(first.asset), isFalse);
    },
  );

  test(
    'delete never touches a file outside the managed imports directory',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'soundscape-delete-boundary-test-',
      );
      addTearDown(() async {
        if (await directory.exists()) await directory.delete(recursive: true);
      });
      final source = File(
        '${directory.path}${Platform.pathSeparator}keep-this.wav',
      );
      await source.writeAsBytes(List<int>.filled(32, 7));
      final importer = LocalSoundAssetImporter(
        directoryPathProvider: () async => directory.path,
      );
      final imported = await importer.importFile(XFile(source.path));
      final forgedJson = imported.asset.toJson();
      forgedJson['segments'] = [
        {...imported.asset.segments.single.toJson(), 'path': source.path},
      ];
      final forgedAsset = SoundAsset.fromJson(forgedJson);

      await importer.delete(forgedAsset);

      expect(await source.exists(), isTrue);
    },
  );

  test(
    'empty and unsupported files are rejected before catalog insertion',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'soundscape-invalid-import-test-',
      );
      addTearDown(() async {
        if (await directory.exists()) await directory.delete(recursive: true);
      });
      final importer = LocalSoundAssetImporter(
        directoryPathProvider: () async => directory.path,
      );
      final empty = File('${directory.path}${Platform.pathSeparator}empty.wav');
      final text = File('${directory.path}${Platform.pathSeparator}notes.txt');
      await empty.writeAsBytes(const []);
      await text.writeAsString('not audio');

      expect(
        () => importer.importFile(XFile(empty.path)),
        throwsFormatException,
      );
      expect(
        () => importer.importFile(XFile(text.path)),
        throwsFormatException,
      );
    },
  );
}
