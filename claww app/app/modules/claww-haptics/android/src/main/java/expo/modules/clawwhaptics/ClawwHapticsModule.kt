package expo.modules.clawwhaptics

import android.content.Context
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Dial haptics, the way the camera zoom wheel does them: a crisp, scalable tick per mark.
 *
 * Android's haptics guide: use the phone's own tuned effects, keep a click to 10 to 20 ms, scale the strength with how
 * important the moment is, and never fall back to a long buzz. Phones differ a lot, so each play picks the best tier the
 * phone really supports (asked once, then cached):
 *
 *   1. composition primitives (API 30+): TICK / LOW_TICK / CLICK / THUD with a 0..1 scale. Pixels and most flagships.
 *   2. predefined effects (API 29+): EFFECT_TICK / CLICK / HEAVY_CLICK, only when the phone says it supports them.
 *   3. a short one-shot: 8 to 28 ms, at full amplitude when the motor can vary it. A phone with a basic motor (no
 *      haptic engine) lands here, where a short full-strength pulse is the only thing it renders as a distinct click.
 *
 * Played as touch feedback (API 33+), so the phone's own touch-feedback setting still applies: if the user turned
 * touch vibration off in system settings, the dial respects that.
 */
class ClawwHapticsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val vibrator: Vibrator? by lazy {
    if (Build.VERSION.SDK_INT >= 31) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
  }

  private fun primitiveIds(): IntArray {
    val ids = mutableListOf(
      VibrationEffect.Composition.PRIMITIVE_CLICK,
      VibrationEffect.Composition.PRIMITIVE_TICK,
      VibrationEffect.Composition.PRIMITIVE_THUD
    )
    if (Build.VERSION.SDK_INT >= 31) ids.add(VibrationEffect.Composition.PRIMITIVE_LOW_TICK)
    return ids.toIntArray()
  }

  /** Which primitives this phone really supports, by id. Empty below API 30 or on a phone with no haptic engine. */
  private val supportedPrimitives: Set<Int> by lazy {
    val v = vibrator
    if (v == null || Build.VERSION.SDK_INT < 30) {
      emptySet()
    } else {
      try {
        val ids = primitiveIds()
        val ok = v.arePrimitivesSupported(*ids)
        ids.filterIndexed { i, _ -> ok[i] }.toSet()
      } catch (e: Exception) {
        emptySet()
      }
    }
  }

  private fun effectSupported(effect: Int): Boolean {
    val v = vibrator ?: return false
    if (Build.VERSION.SDK_INT < 30) return false
    return try {
      v.areEffectsSupported(effect)[0] == Vibrator.VIBRATION_EFFECT_SUPPORT_YES
    } catch (e: Exception) {
      false
    }
  }

  private fun amplitudeControl(): Boolean = vibrator?.hasAmplitudeControl() == true

  private fun run(effect: VibrationEffect) {
    val v = vibrator ?: return
    try {
      if (Build.VERSION.SDK_INT >= 33) {
        v.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH))
      } else {
        v.vibrate(effect)
      }
    } catch (e: Exception) {
      // a haptic is a nicety, never a crash
    }
  }

  private fun primitive(id: Int, scale: Float): Boolean {
    if (!supportedPrimitives.contains(id)) return false
    run(VibrationEffect.startComposition().addPrimitive(id, scale.coerceIn(0f, 1f)).compose())
    return true
  }

  private fun predefined(effect: Int): Boolean {
    if (!effectSupported(effect)) return false
    run(VibrationEffect.createPredefined(effect))
    return true
  }

  private fun pulse(ms: Long, amplitude: Int) {
    val amp = if (amplitudeControl()) amplitude.coerceIn(1, 255) else VibrationEffect.DEFAULT_AMPLITUDE
    run(VibrationEffect.createOneShot(ms, amp))
  }

  /** kind: tick (a mark), major (a labelled mark), grab (picked up), edge (end of range), click (a confirm). */
  private fun play(kind: String, intensity: Float) {
    val s = intensity.coerceIn(0f, 1f)
    when (kind) {
      "major" -> {
        if (primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.55f + 0.35f * s)) return
        if (predefined(VibrationEffect.EFFECT_CLICK)) return
        pulse(22, 255)
      }
      "grab" -> {
        if (Build.VERSION.SDK_INT >= 31 && primitive(VibrationEffect.Composition.PRIMITIVE_LOW_TICK, 0.7f)) return
        if (primitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.45f)) return
        if (predefined(VibrationEffect.EFFECT_TICK)) return
        pulse(8, 150)
      }
      "edge" -> {
        if (primitive(VibrationEffect.Composition.PRIMITIVE_THUD, 0.6f)) return
        if (predefined(VibrationEffect.EFFECT_HEAVY_CLICK)) return
        pulse(28, 255)
      }
      "click" -> {
        if (primitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.8f)) return
        if (predefined(VibrationEffect.EFFECT_CLICK)) return
        pulse(22, 255)
      }
      else -> {
        // a plain mark: crisp and light, a touch stronger the faster the thumb moves
        if (primitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.35f + 0.4f * s)) return
        if (Build.VERSION.SDK_INT >= 31 && primitive(VibrationEffect.Composition.PRIMITIVE_LOW_TICK, 0.5f + 0.4f * s)) return
        if (predefined(VibrationEffect.EFFECT_TICK)) return
        pulse(12, 255)
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ClawwHaptics")

    Function("play") { kind: String, intensity: Double ->
      play(kind, intensity.toFloat())
    }

    // What this phone can do, so the app (and a person reading the log) knows which tier plays.
    Function("capabilities") {
      mapOf(
        "sdk" to Build.VERSION.SDK_INT,
        "hasVibrator" to (vibrator?.hasVibrator() == true),
        "amplitudeControl" to amplitudeControl(),
        "primitives" to supportedPrimitives.toList(),
        "effectTick" to effectSupported(VibrationEffect.EFFECT_TICK),
        "effectClick" to effectSupported(VibrationEffect.EFFECT_CLICK)
      )
    }
  }
}
