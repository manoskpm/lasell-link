package com.lasket.notify

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/// 셀러가 서버 주소·연동키를 넣고, 어떤 은행 앱 알림을 보낼지 고르는 설정 화면.
/// 여기서 고른 은행 앱이 아니면 알림 내용은 폰 밖으로 절대 나가지 않음 (NotifyListenerService 참고)
class MainActivity : AppCompatActivity() {

    companion object {
        const val PREFS = "notify_prefs"
        const val KEY_URL = "url"
        const val KEY_SECRET = "secret"
        const val KEY_PACKAGES = "allowed_packages" // 쉼표로 구분해서 저장

        // 확인된 은행 앱 패키지명. 목록에 없는 은행은 화면에서 직접 입력하게 함
        const val PKG_KAKAOBANK = "com.kakaobank.channel"
        const val PKG_TOSS = "viva.republica.toss"
        const val PKG_KB = "com.kbstar.kbbank"
        const val PKG_SHINHAN = "com.shinhan.sbanking"
    }

    private lateinit var prefs: android.content.SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        val inputUrl = findViewById<EditText>(R.id.inputUrl)
        val inputSecret = findViewById<EditText>(R.id.inputSecret)
        val inputExtraPackages = findViewById<EditText>(R.id.inputExtraPackages)
        val checkKakaoBank = findViewById<CheckBox>(R.id.checkKakaoBank)
        val checkToss = findViewById<CheckBox>(R.id.checkToss)
        val checkKb = findViewById<CheckBox>(R.id.checkKb)
        val checkShinhan = findViewById<CheckBox>(R.id.checkShinhan)

        inputUrl.setText(prefs.getString(KEY_URL, ""))
        inputSecret.setText(prefs.getString(KEY_SECRET, ""))
        val savedPackages = (prefs.getString(KEY_PACKAGES, "") ?: "").split(",").filter { it.isNotBlank() }.toSet()
        checkKakaoBank.isChecked = savedPackages.contains(PKG_KAKAOBANK)
        checkToss.isChecked = savedPackages.contains(PKG_TOSS)
        checkKb.isChecked = savedPackages.contains(PKG_KB)
        checkShinhan.isChecked = savedPackages.contains(PKG_SHINHAN)
        val knownPackages = setOf(PKG_KAKAOBANK, PKG_TOSS, PKG_KB, PKG_SHINHAN)
        inputExtraPackages.setText(savedPackages.filter { it !in knownPackages }.joinToString(","))

        findViewById<Button>(R.id.buttonSave).setOnClickListener {
            val chosen = mutableSetOf<String>()
            if (checkKakaoBank.isChecked) chosen.add(PKG_KAKAOBANK)
            if (checkToss.isChecked) chosen.add(PKG_TOSS)
            if (checkKb.isChecked) chosen.add(PKG_KB)
            if (checkShinhan.isChecked) chosen.add(PKG_SHINHAN)
            inputExtraPackages.text.toString().split(",").map { it.trim() }.filter { it.isNotEmpty() }
                .forEach { chosen.add(it) }

            prefs.edit()
                .putString(KEY_URL, inputUrl.text.toString().trim())
                .putString(KEY_SECRET, inputSecret.text.toString().trim())
                .putString(KEY_PACKAGES, chosen.joinToString(","))
                .apply()

            Toast.makeText(this, "저장했어요.", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.buttonNotificationAccess).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        findViewById<Button>(R.id.buttonBatteryOptimization).setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    startActivity(
                        Intent(
                            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                            Uri.parse("package:$packageName")
                        )
                    )
                } catch (e: Exception) {
                    // 일부 제조사(특히 삼성) 기기는 이 화면을 안드로이드 기본 방식으로 안 열어줌 —
                    // 그런 기기는 "설정 > 배터리 > 백그라운드 사용 제한"에서 직접 켜야 함
                    startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        findViewById<TextView>(R.id.statusListener).text =
            if (isNotificationAccessGranted()) "허용됨 ✓" else "아직 허용 안 됨 — 아래 버튼을 눌러주세요"
    }

    private fun isNotificationAccessGranted(): Boolean {
        val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: ""
        return enabled.contains(packageName)
    }
}
