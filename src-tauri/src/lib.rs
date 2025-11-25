#![allow(unexpected_cfgs)]
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
use objc::runtime::Object;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

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
    .decorations(!embedded) // Show decorations if not embedded
    .skip_taskbar(embedded) // Skip taskbar if embedded
    .disable_drag_drop_handler() // Fix: Allow internal drag-and-drop (e.g. tabs, discord servers)
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

    // Set size and position using Physical units to match frontend calculations
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    
    #[cfg(not(target_os = "macos"))]
    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    if embedded {
        if let Some(main_window) = app.get_webview_window("main") {
            let main_pos = main_window.inner_position().map_err(|e| e.to_string())?;
            // On macOS, we need to account for the title bar height manually
            let scale_factor = main_window.scale_factor().map_err(|e| e.to_string())?;
            let title_bar_height = (28.0 * scale_factor) as i32;
            
            let new_x = main_pos.x + x;
            let new_y = main_pos.y + y + title_bar_height;
            
            window
                .set_position(tauri::PhysicalPosition::new(new_x, new_y))
                .map_err(|e| e.to_string())?;
            
            // Adjust height to account for the title bar offset so it doesn't overflow
            if height > title_bar_height as u32 {
                window
                    .set_size(tauri::PhysicalSize::new(width, height - title_bar_height as u32))
                    .map_err(|e| e.to_string())?;
            }
        }
    } else {
        window
            .set_position(tauri::PhysicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
    }

    if embedded {
        if let Some(main_window) = app.get_webview_window("main") {
            #[cfg(target_os = "macos")]
            {
                let child_ns_window: *mut Object = window.ns_window().map_err(|e| e.to_string())? as *mut Object;
                let main_ns_window: *mut Object = main_window.ns_window().map_err(|e| e.to_string())? as *mut Object;
                
                // Cast to usize to allow moving into closure (Send)
                let child_ptr = child_ns_window as usize;
                let main_ptr = main_ns_window as usize;
                
                let _ = app.run_on_main_thread(move || {
                    let child = child_ptr as *mut Object;
                    let main = main_ptr as *mut Object;
                    unsafe {
                        let _: () = msg_send![main, addChildWindow:child ordered:1]; // 1 = NSWindowAbove
                        let _: () = msg_send![child, makeKeyAndOrderFront:0];
                    }
                });
            }

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

        #[cfg(target_os = "macos")]
        {
            let child_ns_window: *mut Object = window.ns_window().map_err(|e| e.to_string())? as *mut Object;
            if let Some(main_window) = app.get_webview_window("main") {
                let main_ns_window: *mut Object = main_window.ns_window().map_err(|e| e.to_string())? as *mut Object;
                
                let child_ptr = child_ns_window as usize;
                let main_ptr = main_ns_window as usize;
                let is_embedded = embedded;

                let _ = app.run_on_main_thread(move || {
                    let child = child_ptr as *mut Object;
                    let main = main_ptr as *mut Object;
                    unsafe {
                        if is_embedded {
                            let _: () = msg_send![main, addChildWindow:child ordered:1]; // 1 = NSWindowAbove
                            let _: () = msg_send![child, makeKeyAndOrderFront:0];
                        } else {
                            let _: () = msg_send![main, removeChildWindow:child];
                        }
                    }
                });
            }
        }

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
        #[cfg(target_os = "macos")]
        {
            // On macOS, if embedded, we need to offset by main window position
            // We check if it's embedded by checking decorations (embedded = no decorations)
            if !window.is_decorated().map_err(|e| e.to_string())? {
                if let Some(main_window) = app.get_webview_window("main") {
                    let main_pos = main_window.inner_position().map_err(|e| e.to_string())?;
                    let scale_factor = main_window.scale_factor().map_err(|e| e.to_string())?;
                    let title_bar_height = (28.0 * scale_factor) as i32;

                    let new_x = main_pos.x + x;
                    let new_y = main_pos.y + y + title_bar_height;
                    window
                        .set_position(tauri::PhysicalPosition::new(new_x, new_y))
                        .map_err(|e| e.to_string())?;
                    
                    // Adjust height to account for the title bar offset
                    if height > title_bar_height {
                        window
                            .set_size(tauri::PhysicalSize::new(width as u32, (height - title_bar_height) as u32))
                            .map_err(|e| e.to_string())?;
                    }
                }
            } else {
                window
                    .set_position(tauri::PhysicalPosition::new(x, y))
                    .map_err(|e| e.to_string())?;
                window
                    .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
                    .map_err(|e| e.to_string())?;
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            window
                .set_position(tauri::PhysicalPosition::new(x, y))
                .map_err(|e| e.to_string())?;

            window
                .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
                .map_err(|e| e.to_string())?;
        }
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
    println!("Starting Tauri application...");
    tauri::Builder::default()
        .setup(|_app| {
            println!("Tauri setup hook executing...");
            Ok(())
        })
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
