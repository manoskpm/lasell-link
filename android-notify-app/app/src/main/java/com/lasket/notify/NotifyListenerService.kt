package com.lasket.notify

import android.content.Context
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
import org.json.JSONObject

/// 셀러가 설정 화면에서 고른 은행 앱의 알림만 서버로 보냄.
/// 고르지 않은 앱(카톡, 문자, 다른 알림 등)은 여기서 걸러져서 아예 서버로 나가지 않음
class NotifyListenerService : NotificationListenerService() {

    private val executor = Executors.newSingleThreadExecutor()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val prefs = applicationContext.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE)
        val allowedPackages = (prefs.getString(MainActivity.KEY_PACKAGES, "") ?: "")
            .split(",").filter { it.isNotBlank() }.toSet()
        if (sbn.packageName !in allowedPackages) return

        val url = prefs.getString(MainActivity.KEY_URL, "") ?: ""
        val secret = prefs.getString(MainActivity.KEY_SECRET, "") ?: ""
        if (url.isBlank() || secret.isBlank()) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val rawText = "$title $text".trim()
        if (rawText.isBlank()) return

        val receivedAt = isoNow()
        executor.submit { send(url, secret, rawText, receivedAt) }
    }

    private fun isoNow(): String {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        format.timeZone = TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date())
    }

    private fun send(urlString: String, secret: String, rawText: String, receivedAt: String) {
        try {
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
            if (code !in 200..299) {
                Log.w("NotifyListener", "서버 응답 실패: $code")
            }
            connection.disconnect()
        } catch (e: Exception) {
            // 네트워크가 잠깐 끊긴 정도로는 앱이 죽지 않게 함. 재시도는 하지 않음(다음 알림 때 다시 시도되는 셈)
            Log.w("NotifyListener", "전송 실패", e)
        }
    }
}
