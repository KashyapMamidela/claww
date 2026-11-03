package expo.modules.clawwsessionnotification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * NG PHASE 3.5: the workout's ongoing notification on the lock screen and in the shade.
 *
 * expo-notifications cannot show a live countdown, and the usual alternative (Notifee) has not been
 * updated since December 2024, so this is a small module of our own: one ongoing notification with a
 * system-drawn chronometer (it keeps counting while the app is suspended) and up to three action
 * buttons. A button tap is a broadcast to this module, which hands it to JavaScript as an
 * `onAction` event; the app then runs the same session functions as the on-screen buttons, and the
 * set queue's client ids keep a repeated tap from logging a set twice.
 */
class ClawwSessionNotificationModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ClawwSessionNotification")

    Events("onAction")

    OnCreate {
      val r = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
          val action = intent?.getStringExtra(EXTRA_ACTION) ?: return
          sendEvent("onAction", mapOf("action" to action))
        }
      }
      receiver = r
      ContextCompat.registerReceiver(context, r, IntentFilter(ACTION_BROADCAST), ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    OnDestroy {
      receiver?.let { runCatching { context.unregisterReceiver(it) } }
      receiver = null
      hide()
    }

    // Shows or updates the notification (same id, so it updates in place without a new sound).
    // chronometerAtMs: epoch ms the chronometer counts down to (rest) or up from (elapsed); null for none.
    // actions: ids from "done", "skip", "minus15" (at most three), shown in that order.
    Function("show") { title: String, text: String, chronometerAtMs: Double?, countDown: Boolean, actions: List<String> ->
      show(title, text, chronometerAtMs, countDown, actions)
    }

    Function("hide") {
      hide()
    }
  }

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Workout in progress", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Shows your current set and rest timer while you train"
      setShowBadge(false)
      setSound(null, null)
      enableVibration(false)
    }
    nm.createNotificationChannel(channel)
  }

  private fun actionIntent(ctx: Context, id: String, requestCode: Int): PendingIntent {
    val intent = Intent(ACTION_BROADCAST).setPackage(ctx.packageName).putExtra(EXTRA_ACTION, id)
    return PendingIntent.getBroadcast(ctx, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun show(title: String, text: String, chronometerAtMs: Double?, countDown: Boolean, actions: List<String>) {
    val ctx = context
    ensureChannel(ctx)

    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
    val open = launch?.let { PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }

    val icon = ctx.resources.getIdentifier("claww_session_icon", "drawable", ctx.packageName).takeIf { it != 0 }
      ?: ctx.applicationInfo.icon

    val b = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(icon)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setColor(0xFF3B82F6.toInt())
    if (open != null) b.setContentIntent(open)

    if (chronometerAtMs != null) {
      b.setShowWhen(true).setWhen(chronometerAtMs.toLong()).setUsesChronometer(true).setChronometerCountDown(countDown)
    } else {
      b.setShowWhen(false)
    }

    val labels = mapOf("done" to "Done", "skip" to "Skip", "minus15" to "-15 s")
    actions.filter { labels.containsKey(it) }.take(3).forEachIndexed { i, id ->
      b.addAction(0, labels.getValue(id), actionIntent(ctx, id, 100 + i))
    }

    val nm = NotificationManagerCompat.from(ctx)
    // Without the notification permission (Android 13+) there is simply nothing to show.
    if (nm.areNotificationsEnabled()) {
      runCatching { nm.notify(NOTIFICATION_ID, b.build()) }
    }
  }

  private fun hide() {
    val ctx = appContext.reactContext ?: return
    NotificationManagerCompat.from(ctx).cancel(NOTIFICATION_ID)
  }

  companion object {
    private const val CHANNEL_ID = "claww-session"
    private const val NOTIFICATION_ID = 7301
    private const val ACTION_BROADCAST = "com.claww.app.SESSION_ACTION"
    private const val EXTRA_ACTION = "action"
  }
}
