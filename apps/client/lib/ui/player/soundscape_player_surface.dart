import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

import '../../audio/soundscape_controller.dart';
import '../../audio/soundscape_runtime.dart';
import '../../domain/sound_asset.dart';
import '../../domain/soundscape_catalog.dart';
import '../../domain/soundscape_scene.dart';
import '../../domain/soundscape_user_state.dart';
import '../theme/soundscape_theme.dart';
import 'player_control_rail.dart';

part 'player_chrome.part.dart';
part 'player_listening.part.dart';
part 'player_controls.part.dart';
part 'player_immersive.part.dart';
part 'player_library.part.dart';

class SoundscapePlayerSurface extends StatefulWidget {
  const SoundscapePlayerSurface({
    required this.snapshot,
    required this.controller,
    required this.expansion,
    required this.immersion,
    required this.chromeVisible,
    required this.transitioning,
    required this.onInformationTap,
    required this.onTogglePlayback,
    required this.onArtworkTap,
    required this.onTopRightTap,
    required this.onUserActivity,
    super.key,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final double expansion;
  final double immersion;
  final bool chromeVisible;
  final bool transitioning;
  final VoidCallback? onInformationTap;
  final Future<void> Function() onTogglePlayback;
  final VoidCallback onArtworkTap;
  final VoidCallback onTopRightTap;
  final VoidCallback onUserActivity;

  @override
  State<SoundscapePlayerSurface> createState() =>
      _SoundscapePlayerSurfaceState();
}

class _SoundscapePlayerSurfaceState extends State<SoundscapePlayerSurface>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breathing;

  @override
  void initState() {
    super.initState();
    _breathing = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breathing.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final surface = dark
        ? SoundscapeColors.darkSurface
        : SoundscapeColors.surface;
    final playerBackground = Color.lerp(
      surface,
      const Color(0xFF0A0D0C),
      widget.immersion,
    );
    final expansionOpacity = Curves.easeOut.transform(
      ((widget.expansion - 0.08) / 0.56).clamp(0.0, 1.0),
    );
    final compact = widget.immersion > 0.5;
    final chromeOpacity = compact
        ? (widget.chromeVisible ? 1.0 : 0.0)
        : expansionOpacity;
    final safeTop = MediaQuery.paddingOf(context).top;
    final railTotalHeight =
        playerRailHeight + MediaQuery.paddingOf(context).bottom;
    final listeningHeight = MediaQuery.sizeOf(context).height - railTotalHeight;

    return Listener(
      onPointerDown: (_) => widget.onUserActivity(),
      onPointerMove: (_) => widget.onUserActivity(),
      child: ClipRect(
        child: ColoredBox(
          color: playerBackground ?? surface,
          child: Stack(
            fit: StackFit.expand,
            children: [
              IgnorePointer(
                ignoring: widget.immersion < 0.5,
                child: Opacity(
                  opacity: widget.immersion,
                  child: _ImmersiveBackdrop(
                    snapshot: widget.snapshot,
                    onActivity: widget.onUserActivity,
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: listeningHeight,
                child: IgnorePointer(
                  ignoring: widget.expansion < 0.9 || compact,
                  child: Opacity(
                    opacity: expansionOpacity * (1 - widget.immersion),
                    child: _ListeningContent(
                      snapshot: widget.snapshot,
                      controller: widget.controller,
                      breathing: _breathing,
                      onArtworkTap: widget.onArtworkTap,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: safeTop + 66,
                child: IgnorePointer(
                  child: Opacity(
                    opacity: expansionOpacity * (1 - widget.immersion),
                    child: ColoredBox(color: surface),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: IgnorePointer(
                  ignoring: compact && !widget.chromeVisible,
                  child: AnimatedOpacity(
                    opacity: compact ? chromeOpacity : 1,
                    duration: const Duration(milliseconds: 260),
                    curve: Curves.easeOut,
                    child: PlayerControlRail(
                      snapshot: widget.snapshot,
                      controller: widget.controller,
                      onInformationTap: widget.onInformationTap,
                      onTogglePlayback: widget.onTogglePlayback,
                      transitioning: widget.transitioning,
                      compact: compact,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 20,
                top: safeTop + 14,
                child: IgnorePointer(
                  ignoring: chromeOpacity < 0.9,
                  child: AnimatedOpacity(
                    opacity: chromeOpacity,
                    duration: const Duration(milliseconds: 240),
                    child: _PlayerBrand(darkBackdrop: compact),
                  ),
                ),
              ),
              Positioned(
                right: 18,
                top: safeTop + 12,
                child: IgnorePointer(
                  ignoring: chromeOpacity < 0.9,
                  child: AnimatedOpacity(
                    opacity: chromeOpacity,
                    duration: const Duration(milliseconds: 240),
                    child: _TopRightControl(
                      immersive: compact,
                      onPressed: widget.onTopRightTap,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
