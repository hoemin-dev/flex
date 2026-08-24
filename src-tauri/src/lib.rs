use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowRect { x: i32, y: i32, width: u32, height: u32 }

fn dock_rect(hub: WindowRect, flex_width: u32) -> WindowRect {
    WindowRect { x: hub.x - flex_width as i32, y: hub.y, width: flex_width, height: hub.height }
}

fn apply_dock(app: &AppHandle, hub_rect: WindowRect, flex_width: u32) -> Result<WindowRect, String> {
    let rect = dock_rect(hub_rect, flex_width);
    let window = app.get_webview_window("flex").ok_or("Flex window is unavailable")?;
    window.set_size(PhysicalSize::new(rect.width, rect.height)).map_err(|error| error.to_string())?;
    window.set_position(PhysicalPosition::new(rect.x, rect.y)).map_err(|error| error.to_string())?;
    window.set_always_on_top(true).map_err(|error| error.to_string())?;
    Ok(rect)
}

#[tauri::command]
fn sync_to_hub_rect(app: AppHandle, hub_rect: WindowRect, flex_width: u32) -> Result<WindowRect, String> {
    apply_dock(&app, hub_rect, flex_width)
}

#[tauri::command]
fn expand_flex(app: AppHandle, hub_rect: WindowRect, flex_width: u32) -> Result<WindowRect, String> {
    let rect = apply_dock(&app, hub_rect, flex_width)?;
    let window = app.get_webview_window("flex").ok_or("Flex window is unavailable")?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(rect)
}

#[tauri::command]
fn collapse_flex(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("flex").ok_or("Flex window is unavailable")?.hide().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sync_to_hub_rect, expand_flex, collapse_flex])
        .run(tauri::generate_context!())
        .expect("error while running MONA Flex");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn dock_is_flush_to_hub_left_edge() {
        let hub = WindowRect { x: 1200, y: 80, width: 72, height: 900 };
        let flex = dock_rect(hub, 440);
        assert_eq!(flex.x + flex.width as i32, hub.x);
        assert_eq!(flex.y, hub.y);
        assert_eq!(flex.height, hub.height);
    }
}
