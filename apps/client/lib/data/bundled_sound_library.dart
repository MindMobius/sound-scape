import 'dart:convert';

import 'package:flutter/services.dart';

import '../domain/sound_asset.dart';

class BundledSoundLibrary {
  BundledSoundLibrary({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;

  static const manifestPath = 'assets/generated/catalog/sound-library.v1.json';

  final AssetBundle _bundle;

  Future<SoundLibrary> load() async {
    final source = await _bundle.loadString(manifestPath);
    return SoundLibrary.fromJson(
      (jsonDecode(source) as Map<Object?, Object?>).cast<String, Object?>(),
    );
  }
}
