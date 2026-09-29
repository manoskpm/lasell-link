package com.lasket.notify

import android.content.Context
import android.content.SharedPreferences
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import org.json.JSONArray
import org.json.JSONObject

/// 셀러가 설정 화면에서 고른 은행 앱의 알림만 서버로 보냄.
/// 고르지 않은 앱(카톡, 문자, 다른 알림 등)은 여기서 걸러져서 아예 서버로 나가지 않음.
///
/// 전송이 실패하면(네트워크 끊김 등) 폰 안(SharedPreferences)에 잠깐 저장해두고,
/// 다음 알림이 오거나 서비스가 다시 연결될 때(폰 재시작, 앱 실행 등) 다시 보내려고 시도함.
/// 24시간이 지난 것은 이미 의미가 없으니 버림
class NotifyListenerService : NotificationListenerService() {

    companion object {
        private const val QUEUE_KEY = "pending_queue"
        private const val MAX_QUEUE_SIZE = 200
        private const val MAX_QUEUE_AGE_MS = 24L * 60 * 60 * 1000
    }

    private val executor = Executors.newSingleThreadExecutor()

    override fun onListenerConnected() {
        super.onListenerConnected()
        // 서비스가 (다시) 연결될 때 — 폰 재시작, 앱 재실행 등 — 밀려있던 알림부터 보내봄
        executor.submit { flushQueue() }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // 새 알림을 처리하기 전에, 밀려있던 예전 알림부터 먼저 보내려고 시도함
        executor.submit { flushQueue() }

        val prefs = prefs()
        val allowedPackages = (prefs.getString(MainActivity.KEY_PACKAGES, "") ?: "")
            .split(",").filter { it.isNotBlank() }.toSet()
        if (sbn.packageName !in allowedPackages) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val rawText = "$title $text".trim()
        if (rawText.isBlank()) return

        val receivedAt = isoNow()
        executor.submit { sendOrQueue(rawText, receivedAt) }
    }

    private fun isoNow(): String {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        format.timeZone = TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date())
    }

    private fun prefs(): SharedPreferences =
        applicationContext.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE)

    /// 지금 보내보고, 실패하면 나중에 다시 보내려고 폰 안에 저장해둠
    private fun sendOrQueue(rawText: String, receivedAt: String) {
        val p = prefs()
        val url = p.getString(MainActivity.KEY_URL, "") ?: ""
        val secret = p.getString(MainActivity.KEY_SECRET, "") ?: ""
        if (url.isBlank() || secret.isBlank()) return

        if (!send(url, secret, rawText, receivedAt)) {
            enqueue(p, rawText, receivedAt)
        }
    }

    private fun loadQueue(p: SharedPreferences): JSONArray {
        return try {
            JSONArray(p.getString(QUEUE_KEY, "[]"))
        } catch (e: Exception) {
            JSONArray()
        }
    }

    private fun enqueue(p: SharedPreferences, rawText: String, receivedAt: String) {
        val queue = loadQueue(p)
        queue.put(
            JSONObject().apply {
                put("rawText", rawText)
                put("receivedAt", receivedAt)
                put("enqueuedAtMs", System.currentTimeMillis())
            }
        )

        // 24시간 지난 건 버리고, 그래도 너무 많이 쌓였으면 오래된 것부터 버림 (용량 보호)
        val now = System.currentTimeMillis()
        val kept = JSONArray()
        for (i in 0 until queue.length()) {
            val item = queue.getJSONObject(i)
            if (now - item.optLong("enqueuedAtMs", 0) <= MAX_QUEUE_AGE_MS) {
                kept.put(item)
            }
        }
        while (kept.length() > MAX_QUEUE_SIZE) {
            kept.remove(0)
        }
        p.edit().putString(QUEUE_KEY, kept.toString()).apply()
    }

    /// 밀려있는 알림을 순서대로 다시 보내봄. 성공한 건 큐에서 빠지고, 여전히 실패한 건 남음
    private fun flushQueue() {
        val p = prefs()
        val url = p.getString(MainActivity.KEY_URL, "") ?: ""
        val secret = p.getString(MainActivity.KEY_SECRET, "") ?: ""
        if (url.isBlank() || secret.isBlank()) return

        val queue = loadQueue(p)
        if (queue.length() == 0) return

        val now = System.currentTimeMillis()
        val remaining = JSONArray()
        for (i in 0 until queue.length()) {
            val item = queue.getJSONObject(i)
            if (now - item.optLong("enqueuedAtMs", 0) > MAX_QUEUE_AGE_MS) continue // 24시간 지나면 포기

            val ok = send(url, secret, item.getString("rawText"), item.getString("receivedAt"))
            if (!ok) remaining.put(item)
        }
        p.edit().putString(QUEUE_KEY, remaining.toString()).apply()
    }

    /// 성공하면 true, 실패하면(네트워크 문제·서버 오류 등) false
    private fun send(urlString: String, secret: String, rawText: String, receivedAt: String): Boolean {
        return try {
            val connection = URL(urlString).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $secret")
            connection.doOutput = true
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000

            val body = JSONObject().apply {
                put("rawText", rawText)
                put("receivedAt", receivedAt)
                put("source", "ANDROID")
            }
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

            val code = connection.responseCode
            connection.disconnect()
            if (code in 200..299) {
                true
            } else {
                Log.w("NotifyListener", "서버 응답 실패: $code")
                false
            }
        } catch (e: Exception) {
            Log.w("NotifyListener", "전송 실패", e)
            false
        }
    }
}
