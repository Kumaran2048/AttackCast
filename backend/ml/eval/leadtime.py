def lead_time(alert_window, onset_window, window_seconds=30):
    return {"windows":max(0,onset_window-alert_window),"seconds":max(0,onset_window-alert_window)*window_seconds}
