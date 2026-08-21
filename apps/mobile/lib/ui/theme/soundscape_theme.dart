import 'package:flutter/material.dart';

abstract final class SoundscapeColors {
  static const ground = Color(0xFFF4F6F3);
  static const surface = Color(0xFFFAFBF8);
  static const raised = Color(0xFFFFFFFF);
  static const muted = Color(0xFFE9EEEA);
  static const ink = Color(0xFF1D2420);
  static const inkSecondary = Color(0xFF59635D);
  static const line = Color(0xFFD5DCD7);
  static const lineStrong = Color(0xFFAFB9B2);
  static const accent = Color(0xFFCC604B);
  static const accentSoft = Color(0xFFF3DED9);
  static const active = Color(0xFF365F54);
  static const activeSoft = Color(0xFFDCE9E3);

  static const darkGround = Color(0xFF141918);
  static const darkSurface = Color(0xFF191F1D);
  static const darkRaised = Color(0xFF222926);
  static const darkMuted = Color(0xFF2A322F);
  static const darkInk = Color(0xFFF1F3EF);
  static const darkInkSecondary = Color(0xFFB6C0B9);
  static const darkLine = Color(0xFF37403C);
  static const darkLineStrong = Color(0xFF52605A);
  static const darkAccent = Color(0xFFDC765F);
  static const darkAccentSoft = Color(0xFF4A2C27);
  static const darkActive = Color(0xFFA9C8BC);
  static const darkActiveSoft = Color(0xFF243B34);
}

abstract final class SoundscapeTheme {
  static ThemeData get light => _theme(Brightness.light);
  static ThemeData get dark => _theme(Brightness.dark);

  static ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final ground = dark ? SoundscapeColors.darkGround : SoundscapeColors.ground;
    final surface = dark
        ? SoundscapeColors.darkSurface
        : SoundscapeColors.surface;
    final raised = dark ? SoundscapeColors.darkRaised : SoundscapeColors.raised;
    final ink = dark ? SoundscapeColors.darkInk : SoundscapeColors.ink;
    final secondary = dark
        ? SoundscapeColors.darkInkSecondary
        : SoundscapeColors.inkSecondary;
    final line = dark ? SoundscapeColors.darkLine : SoundscapeColors.line;
    final active = dark ? SoundscapeColors.darkActive : SoundscapeColors.active;
    final accent = dark ? SoundscapeColors.darkAccent : SoundscapeColors.accent;

    final body = TextStyle(
      color: ink,
      fontFamily: 'HarmonyOS Sans SC',
      fontFamilyFallback: const [
        'Noto Sans SC',
        'Microsoft YaHei UI',
        'Segoe UI',
      ],
      fontSize: 14,
      height: 1.5,
      letterSpacing: 0,
    );
    final serif = TextStyle(
      color: ink,
      fontFamily: 'Noto Serif SC',
      fontFamilyFallback: const ['Songti SC', 'SimSun', 'serif'],
      letterSpacing: 0,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: ground,
      canvasColor: surface,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: active,
        onPrimary: dark ? SoundscapeColors.darkGround : Colors.white,
        secondary: accent,
        onSecondary: Colors.white,
        error: dark ? const Color(0xFFFFB4AB) : const Color(0xFFBA1A1A),
        onError: Colors.white,
        surface: surface,
        onSurface: ink,
        outline: line,
        outlineVariant: line,
      ),
      textTheme: TextTheme(
        displayLarge: serif.copyWith(
          fontSize: 48,
          fontWeight: FontWeight.w600,
          height: 1.1,
        ),
        headlineLarge: serif.copyWith(
          fontSize: 34,
          fontWeight: FontWeight.w600,
          height: 1.18,
        ),
        headlineMedium: serif.copyWith(
          fontSize: 26,
          fontWeight: FontWeight.w600,
          height: 1.2,
        ),
        titleLarge: serif.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          height: 1.24,
        ),
        titleMedium: body.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
        bodyLarge: body.copyWith(fontSize: 15),
        bodyMedium: body,
        bodySmall: body.copyWith(fontSize: 12, color: secondary),
        labelLarge: body.copyWith(fontSize: 13, fontWeight: FontWeight.w600),
        labelMedium: body.copyWith(fontSize: 11, fontWeight: FontWeight.w600),
      ),
      dividerColor: line,
      sliderTheme: SliderThemeData(
        trackHeight: 2,
        activeTrackColor: active,
        inactiveTrackColor: dark
            ? SoundscapeColors.darkLineStrong
            : SoundscapeColors.lineStrong,
        thumbColor: active,
        overlayColor: active.withValues(alpha: 0.10),
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
        overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? active : secondary,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? active.withValues(alpha: 0.32)
              : line,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size.square(48),
          maximumSize: const Size.square(48),
          foregroundColor: secondary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
        ),
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(raised),
          surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
          elevation: const WidgetStatePropertyAll(8),
          shadowColor: WidgetStatePropertyAll(
            Colors.black.withValues(alpha: dark ? 0.30 : 0.12),
          ),
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ),
      splashFactory: InkSparkle.splashFactory,
    );
  }
}
