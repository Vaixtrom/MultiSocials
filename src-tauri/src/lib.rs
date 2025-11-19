use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_service_view(
    app: tauri::AppHandle,
    id: String,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    embedded: bool,
) -> Result<(), String> {
    let label = format!("service-{}", id);

    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    // Create a frameless window that acts as a child view
    let mut builder = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(url.parse().map_err(|e| format!("{:?}", e))?),
    )
    .title("Service")
    .inner_size(width as f64, height as f64)
    .position(x as f64, y as f64)
    .decorations(!embedded) // Show decorations if not embedded
    .skip_taskbar(embedded) // Skip taskbar if embedded
    .visible(false); // Start hidden

    // Session Isolation: Set a unique data directory for this service
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let service_data_dir = app_data_dir.join(format!("service_data_{}", id));
    builder = builder.data_directory(service_data_dir);

    // We don't use the Tauri parent() method for embedded mode anymore
    // because we want a true WS_CHILD relationship for correct movement.
    // We will handle it manually after creation.
    if !embedded {
        // For windowed mode, we might want it to be owned so it stays on top?
        // Or maybe independent. Let's leave it independent for now as requested "view them all".
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    if embedded {
        if let Some(main_window) = app.get_webview_window("main") {
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::Foundation::HWND;
                use windows::Win32::UI::WindowsAndMessaging::{
                    GetWindowLongPtrW, SetParent, SetWindowLongPtrW, GWL_STYLE, WS_CHILD, WS_POPUP,
                };

                // Tauri v2 window.hwnd() returns Result<HWND>
                // We cast it to our imported HWND to avoid version mismatch issues
                let child_val = window.hwnd().map_err(|e| e.to_string())?;
                let parent_val = main_window.hwnd().map_err(|e| e.to_string())?;

                unsafe {
                    let child_hwnd = HWND(child_val.0 as _);
                    let parent_hwnd = HWND(parent_val.0 as _);

                    // Set parent to main window content
                    SetParent(child_hwnd, parent_hwnd);

                    // Remove WS_POPUP and add WS_CHILD to make it a true child window
                    let style = GetWindowLongPtrW(child_hwnd, GWL_STYLE);
                    let new_style = (style & !WS_POPUP.0 as isize) | WS_CHILD.0 as isize;
                    SetWindowLongPtrW(child_hwnd, GWL_STYLE, new_style);
                }
            }
        }
    }

    // Force position again just in case
    window
        .set_position(tauri::LogicalPosition::new(x as f64, y as f64))
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_service_view_mode(
    app: tauri::AppHandle,
    id: String,
    embedded: bool,
) -> Result<(), String> {
    let label = format!("service-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        // Update Tauri managed properties
        window
            .set_decorations(!embedded)
            .map_err(|e| e.to_string())?;
        window
            .set_skip_taskbar(embedded)
            .map_err(|e| e.to_string())?;

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                GetWindowLongPtrW, SetParent, SetWindowLongPtrW, GWL_STYLE, WS_CHILD, WS_POPUP,
            };

            // Get HWNDs
            let child_val = window.hwnd().map_err(|e| e.to_string())?;
            let child_hwnd = HWND(child_val.0 as _);

            if embedded {
                if let Some(main_window) = app.get_webview_window("main") {
                    let parent_val = main_window.hwnd().map_err(|e| e.to_string())?;
                    let parent_hwnd = HWND(parent_val.0 as _);

                    unsafe {
                        SetParent(child_hwnd, parent_hwnd);
                        let style = GetWindowLongPtrW(child_hwnd, GWL_STYLE);
                        let new_style = (style & !WS_POPUP.0 as isize) | WS_CHILD.0 as isize;
                        SetWindowLongPtrW(child_hwnd, GWL_STYLE, new_style);
                    }
                }
            } else {
                unsafe {
                    // Detach: Set parent to NULL (0)
                    SetParent(child_hwnd, HWND(0));
                    let style = GetWindowLongPtrW(child_hwnd, GWL_STYLE);
                    let new_style = (style & !WS_CHILD.0 as isize) | WS_POPUP.0 as isize;
                    SetWindowLongPtrW(child_hwnd, GWL_STYLE, new_style);
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn update_service_view_bounds(
    app: tauri::AppHandle,
    id: String,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<(), String> {
    let label = format!("service-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_position(tauri::LogicalPosition::new(x as f64, y as f64))
            .map_err(|e| e.to_string())?;
        window
            .set_size(tauri::LogicalSize::new(width as f64, height as f64))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn show_service_view(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let label = format!("service-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn hide_service_view(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let label = format!("service-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn close_service_view(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let label = format!("service-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_service_view,
            update_service_view_bounds,
            show_service_view,
            hide_service_view,
            close_service_view,
            update_service_view_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
