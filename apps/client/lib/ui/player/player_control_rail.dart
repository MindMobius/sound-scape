import 'dart:async';

import 'package:flutter/material.dart';

import '../../audio/soundscape_controller.dart';
import '../../audio/soundscape_runtime.dart';
import '../theme/soundscape_theme.dart';

const double playerRailHeight = 76;

class PlayerControlRail extends StatelessWidget {
  const PlayerControlRail({
    required this.snapshot,
    required this.controller,
    required this.onInformationTap,
    required this.onTogglePlayback,
    required this.transitioning,
    required this.compact,
    super.key,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final VoidCallback? onInformationTap;
  final Future<void> Function() onTogglePlayback;
  final bool transitioning;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final foreground = compact ? Colors.white : theme.colorScheme.onSurface;
    final secondary = compact
        ? Colors.white.withValues(alpha: 0.68)
        : theme.textTheme.bodySmall?.color ?? theme.colorScheme.onSurface;
    final surface = dark
        ? SoundscapeColors.darkRaised
        : SoundscapeColors.raised;

    return SizedBox(
      height: playerRailHeight + MediaQuery.paddingOf(context).bottom,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: compact ? Colors.transparent : surface,
          border: compact
              ? null
              : Border(top: BorderSide(color: theme.dividerColor)),
          boxShadow: compact
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: dark ? 0.18 : 0.06),
                    offset: const Offset(0, -6),
                    blurRadius: 24,
                  ),
                ],
        ),
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.symmetric(horizontal: 12),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1320),
              child: SizedBox(
                height: playerRailHeight - 1,
                child: Row(
                  children: [
                    Expanded(
                      child: IgnorePointer(
                        ignoring: compact,
                        child: AnimatedOpacity(
                          opacity: compact ? 0 : 1,
                          duration: const Duration(milliseconds: 240),
                          curve: Curves.easeOut,
                          child: _SceneInformation(
                            snapshot: snapshot,
                            foreground: foreground,
                            secondary: secondary,
                            onTap: onInformationTap,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    _TimerMenuButton(
                      remaining: snapshot.sleepTimerRemaining,
                      onChanged: controller.setSleepTimer,
                      foreground: foreground,
                      secondary: secondary,
                      compact: compact,
                    ),
                    const SizedBox(width: 6),
                    _VolumeMenuButton(
                      value: snapshot.masterVolume,
                      onChanged: controller.setMasterVolume,
                      foreground: foreground,
                      secondary: secondary,
                      compact: compact,
                    ),
                    const SizedBox(width: 6),
                    _RailButton(
                      tooltip: snapshot.isPlaying ? '暂停' : '播放',
                      icon: snapshot.isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                      label: snapshot.isPlaying ? '暂停' : '播放',
                      foreground: compact
                          ? const Color(0xFF18201C)
                          : (dark ? SoundscapeColors.darkGround : Colors.white),
                      background: compact
                          ? Colors.white.withValues(alpha: 0.92)
                          : foreground,
                      busy: transitioning,
                      onPressed: snapshot.phase == SoundscapePhase.failed
                          ? null
                          : () => unawaited(onTogglePlayback()),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SceneInformation extends StatelessWidget {
  const _SceneInformation({
    required this.snapshot,
    required this.foreground,
    required this.secondary,
    required this.onTap,
  });

  final SoundscapeSnapshot snapshot;
  final Color foreground;
  final Color secondary;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final phaseLabel = switch (snapshot.phase) {
      SoundscapePhase.initializing => '正在准备声音',
      SoundscapePhase.playing => '正在聆听',
      SoundscapePhase.paused => '已暂停',
      SoundscapePhase.failed => '声音暂不可用',
      _ => '准备播放',
    };

    return Semantics(
      button: onTap != null,
      label: onTap == null
          ? '${snapshot.scene.name}，$phaseLabel'
          : '展开 ${snapshot.scene.name}',
      child: InkWell(
        key: const ValueKey('player-information'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(7),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  snapshot.scene.coverAsset,
                  width: 48,
                  height: 48,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 14),
              Flexible(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      snapshot.scene.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: foreground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: snapshot.isPlaying
                                ? Theme.of(context).colorScheme.primary
                                : secondary.withValues(alpha: 0.58),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Flexible(
                          child: Text(
                            phaseLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: secondary),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VolumeMenuButton extends StatelessWidget {
  const _VolumeMenuButton({
    required this.value,
    required this.onChanged,
    required this.foreground,
    required this.secondary,
    required this.compact,
  });

  final double value;
  final ValueChanged<double> onChanged;
  final Color foreground;
  final Color secondary;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      alignmentOffset: const Offset(0, -8),
      style: _verticalMenuStyle(context, height: 218),
      menuChildren: [
        SizedBox(
          width: 58,
          height: 218,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              children: [
                Text(
                  '${(value * 100).round()}',
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: RotatedBox(
                    quarterTurns: -1,
                    child: Slider(value: value, onChanged: onChanged),
                  ),
                ),
                const Icon(Icons.volume_down_rounded, size: 17),
              ],
            ),
          ),
        ),
      ],
      builder: (context, menuController, child) => _RailButton(
        tooltip: '总音量',
        icon: value <= 0.01
            ? Icons.volume_off_rounded
            : Icons.volume_down_rounded,
        label: '${(value * 100).round()}%',
        foreground: foreground,
        background: Colors.transparent,
        onPressed: () {
          menuController.isOpen
              ? menuController.close()
              : menuController.open();
        },
      ),
    );
  }
}

class _TimerMenuButton extends StatelessWidget {
  const _TimerMenuButton({
    required this.remaining,
    required this.onChanged,
    required this.foreground,
    required this.secondary,
    required this.compact,
  });

  final Duration? remaining;
  final ValueChanged<Duration?> onChanged;
  final Color foreground;
  final Color secondary;
  final bool compact;

  String get _label {
    final value = remaining;
    if (value == null) return '未启动';
    final minutes = (value.inSeconds / 60).ceil();
    return '$minutes分';
  }

  @override
  Widget build(BuildContext context) {
    return MenuAnchor(
      alignmentOffset: const Offset(0, -8),
      style: _verticalMenuStyle(context, height: 264),
      menuChildren: [
        SizedBox(
          width: 58,
          height: 264,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              children: [
                for (final minutes in const [60, 45, 30, 15])
                  Expanded(
                    child: _TimerMark(
                      minutes: minutes,
                      selected:
                          remaining != null &&
                          (remaining!.inMinutes - minutes).abs() < 2,
                      onTap: () => onChanged(Duration(minutes: minutes)),
                    ),
                  ),
                Expanded(
                  child: _TimerMark(
                    selected: remaining == null,
                    onTap: () => onChanged(null),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
      builder: (context, menuController, child) => _RailButton(
        tooltip: '倒计时',
        icon: Icons.timer_outlined,
        label: _label,
        foreground: foreground,
        background: Colors.transparent,
        onPressed: () {
          menuController.isOpen
              ? menuController.close()
              : menuController.open();
        },
      ),
    );
  }
}

class _TimerMark extends StatelessWidget {
  const _TimerMark({this.minutes, required this.selected, required this.onTap});

  final int? minutes;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = Theme.of(context).colorScheme.primary;
    final line = Theme.of(context).dividerColor;
    return InkWell(
      onTap: onTap,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: selected ? 7 : 4,
            height: selected ? 7 : 4,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: selected ? active : line,
            ),
          ),
          const SizedBox(width: 5),
          SizedBox(
            width: 22,
            child: Text(
              minutes?.toString() ?? '关',
              style: Theme.of(context).textTheme.labelMedium
                  ?.copyWith(color: selected ? active : null),
            ),
          ),
        ],
      ),
    );
  }
}

MenuStyle _verticalMenuStyle(BuildContext context, {required double height}) {
  final theme = Theme.of(context);
  final dark = theme.brightness == Brightness.dark;
  return MenuStyle(
    fixedSize: WidgetStatePropertyAll(Size(58, height)),
    padding: const WidgetStatePropertyAll(EdgeInsets.zero),
    backgroundColor: WidgetStatePropertyAll(
      dark ? SoundscapeColors.darkRaised : SoundscapeColors.raised,
    ),
    surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
    elevation: const WidgetStatePropertyAll(10),
    shadowColor: WidgetStatePropertyAll(
      Colors.black.withValues(alpha: dark ? 0.32 : 0.14),
    ),
    shape: WidgetStatePropertyAll(
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );
}

class _RailButton extends StatelessWidget {
  const _RailButton({
    required this.tooltip,
    required this.icon,
    required this.label,
    required this.foreground,
    required this.background,
    required this.onPressed,
    this.busy = false,
  });

  final String tooltip;
  final IconData icon;
  final String label;
  final Color foreground;
  final Color background;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: tooltip,
      value: label == tooltip ? null : label,
      child: Tooltip(
        message: tooltip,
        child: ExcludeSemantics(
          child: SizedBox(
            width: 54,
            height: 48,
            child: Material(
              color: background,
              borderRadius: BorderRadius.circular(7),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: onPressed,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (busy)
                      SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.8,
                          color: foreground,
                        ),
                      )
                    else
                      Icon(icon, size: 19, color: foreground),
                    const SizedBox(height: 1),
                    Text(
                      label,
                      maxLines: 1,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: foreground,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
