part of 'soundscape_player_surface.dart';

class _PlayerBrand extends StatelessWidget {
  const _PlayerBrand({required this.darkBackdrop});

  final bool darkBackdrop;

  @override
  Widget build(BuildContext context) {
    final foreground = darkBackdrop
        ? Colors.white
        : Theme.of(context).colorScheme.onSurface;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/generated/images/soundscape-mark.png',
          width: 22,
          height: 22,
          color: foreground,
          colorBlendMode: BlendMode.srcIn,
        ),
        const SizedBox(width: 9),
        Text(
          '声景',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: foreground,
            fontFamily: 'Noto Serif SC',
            fontFamilyFallback: const ['Songti SC', 'SimSun'],
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _TopRightControl extends StatelessWidget {
  const _TopRightControl({required this.immersive, required this.onPressed});

  final bool immersive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final foreground = immersive
        ? Colors.white
        : Theme.of(context).colorScheme.onSurface;
    return IconButton(
      tooltip: immersive ? '返回播放器' : '收起播放器',
      onPressed: onPressed,
      style: IconButton.styleFrom(
        foregroundColor: foreground,
        backgroundColor: immersive
            ? Colors.black.withValues(alpha: 0.18)
            : Colors.transparent,
      ),
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, animation) => RotationTransition(
          turns: Tween<double>(begin: -0.08, end: 0).animate(animation),
          child: FadeTransition(opacity: animation, child: child),
        ),
        child: Icon(
          immersive ? Icons.close_rounded : Icons.keyboard_arrow_down_rounded,
          key: ValueKey(immersive ? 'leave-immersive' : 'collapse-player'),
          size: 24,
        ),
      ),
    );
  }
}
