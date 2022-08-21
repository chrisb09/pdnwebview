let use_webgl = true

let ctx = null;
let canvas = null;
let offscreenContext = null;
let cameraOffset = { x:0, y: 0 }
let previousCameraOffset = { x:0, y: 0 }
let cameraOffsetMin = { x:0, y: 0 }
let cameraOffsetMax = { x:0, y: 0 }
let cameraZoom = 0.5
let previousZoom = 1
let MAX_ZOOM = 2
let MIN_ZOOM = 0.2
let SCROLL_SENSITIVITY = 0.0005

const _PRG = document.getElementById('p'), _OUT = document.querySelector('[for=p]'), K = 5, TMAX = K*_PRG.max;

let double_tap_time = null;

let start_time_image_load = 0

let loading_progress = 0
let complete_layer_amount = -1
let completely_loaded = false

let redo_cache = false
let redo_canvas = false
let schedule_draw = false
let draw_in_progress = false

let layerSize = { x: 0, y: 0}
let project_metadata = null;
let selected_layer = -1;

let layers = []
let layer_click = []
let layer_area = []
let layer_border = []
let layer_info = []
let layer_visibility_copy = []
let layer_opacity = []

let layers_loaded = 0
let layer_click_loaded = 0
let layer_area_loaded = 0
let layer_border_loaded = 0
let layer_info_loaded = 0
let layer_opacity_loaded = 0

let datapath = null

let mobile = null;

function detectMob() {
    const toMatch = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i
    ];
    
    return toMatch.some((toMatchItem) => {
        return navigator.userAgent.match(toMatchItem);
    });
}

function is_mobile(){
    if (mobile == null) {
        mobile = detectMob();
    }
    return mobile;
}

function formatTime(unix_timestamp) {
    let date = new Date(unix_timestamp);
    let datestring = ("0" + date.getDate()).slice(-2) + "." + ("0"+(date.getMonth()+1)).slice(-2) + "." +
    date.getFullYear() + " " + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
    return datestring;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function get_image_name() {
    let url_string = window.location.href;
    console.log(url_string)
    let url = new URL(url_string);
    //%20 for spaces in URL
    console.log(url.searchParams.get("image"));
}

function get_pixel_value(canvas, x, y) {
    if (use_webgl) {
        let context = enableWebGLCanvas( canvas );
        context.start2D();
        data = context.getImageData(x, y, 1, 1).data;
        context.finish2D();
        return data
    }else{
        return canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    }
}

function _create_layers() {
    let main_view = document.getElementById('main_view');
    let image_container = document.createElement('div');
    image_container.id = 'image_container'; 
    console.log("ZOOM: "+cameraZoom)
    console.log(cameraZoom * layerSize.x);
    image_container.style.width = (cameraZoom * layerSize.x)+"px";
    image_container.style.height = (cameraZoom * layerSize.y)+"px";
    main_view.appendChild(image_container);
    let rect = image_container.getBoundingClientRect();
    console.log(rect.top, rect.right, rect.bottom, rect.left);
    
    for (let i = 0; i < layer_amount; i++) {
        let layer_image = document.createElement('div');
        layer_image.id = 'layer_'+i;
        layer_image.classList.add('layer');
        layer_image.style.background = "url("+datapath+"/"+i+".png)";
        layer_image.style.backgroundSize = "100% 100%";
        layer_image.style.zIndex = -100 - 2*(layer_amount-i);
        if (layer_info[i].visible) {
            layer_image.style.opacity = layer_info[i].opacity / 255;
        }else {
            layer_image.style.opacity = 0;
        }
        layer_image.style.mixBlendMode = "normal"; //for now :)
        //layer_image.style.aspectRatio = layer_info[i].x + " / " + layer_info[i].y;
        layer_image.style.aspectRatio = layerSize.x + " / " + layerSize.y;
        image_container.appendChild(layer_image);
        let layer_image_alpha = document.createElement('div');
        layer_image_alpha.id = 'layer_b_'+i;
        layer_image_alpha.classList.add('layer');
        layer_image_alpha.style.background = "url("+datapath+"/"+i+"_b.png)";
        layer_image_alpha.style.backgroundSize = "100% 100%";
        layer_image_alpha.style.zIndex = -101 - 2*(layer_amount-i);
        layer_image_alpha.style.opacity = 0;
        layer_image_alpha.style.mixBlendMode = "normal"; //for now :)
        //layer_image_alpha.style.aspectRatio = layer_info[i].x + " / " + layer_info[i].y;
        layer_image_alpha.style.aspectRatio = layerSize.x + " / " + layerSize.y;
        image_container.appendChild(layer_image_alpha);
    }

    /*
    context.globalAlpha = js.opacity / 255;
    blendMode = js.blendMode;
    switch(blendMode) {
        case "0": context.globalCompositeOperation = "source-over"; break; //Normal
        case "1": context.globalCompositeOperation = "multiply"; break; //Multiply
        case "2": context.globalCompositeOperation = "lighter"; break; //Additive
        case "3": context.globalCompositeOperation = "color-burn"; break; //ColorBurn !NOT THE SAME!
        case "4": context.globalCompositeOperation = "color-dodge"; break; //ColorDodge !NOT THE SAME!
        case "5": context.globalCompositeOperation = "screen"; break; //Reflect !NOT THE SAME!
        case "6": context.globalCompositeOperation = "lighten"; break; //Glow !NOT THE SAME!
        case "7": context.globalCompositeOperation = "overlay"; break; //Overlay
        case "8": context.globalCompositeOperation = "difference"; break; //Difference
        case "9": context.globalCompositeOperation = "exclusion"; break; //Negation !SOMEWHAT WRONG!
        case "10": context.globalCompositeOperation = "lighten"; break; //Lighten
        case "11": context.globalCompositeOperation = "darken"; break; //Darken
        case "12": context.globalCompositeOperation = "screen"; break; //Screen
        case "13": context.globalCompositeOperation = "exclusion"; break; //XOR !SOMEWHAT WRONG!
    }*/
}

function _focus_on_layer(id) {
    
    let target_offset = {x: 0, y: 0};
    let target_zoom = 0;

    if (id >= 0 && id < layer_amount) {

        console.log("Focus on layer: "+id);
        bbox_center_x = (layer_info[id]["bounding_box"]["x_max"]+layer_info[id]["bounding_box"]["x_min"]) / 2;
        bbox_center_y = (layer_info[id]["bounding_box"]["y_max"]+layer_info[id]["bounding_box"]["y_min"]) / 2;
        if (layer_info[id]["bounding_box"]["x_max"]-layer_info[id]["bounding_box"]["x_min"] > 0 &&
            layer_info[id]["bounding_box"]["y_max"]-layer_info[id]["bounding_box"]["y_min"] > 0){
            target_zoom = Math.min(MAX_ZOOM, 0.85*Math.min(window.innerWidth / (layer_info[id]["bounding_box"]["x_max"]-layer_info[id]["bounding_box"]["x_min"]), window.innerHeight / (layer_info[id]["bounding_box"]["y_max"]-layer_info[id]["bounding_box"]["y_min"])));
            target_offset.x = 0.5 * window.innerWidth + (1 - 2*(bbox_center_x / layerSize.x)) * 0.5 * layerSize.x * target_zoom; //parseInt(moving_canvas_container.style.width);
            target_offset.y = 0.5 * window.innerHeight + (1 - 2*(bbox_center_y / layerSize.y)) * 0.5 * layerSize.y * target_zoom; //parseInt(moving_canvas_container.style.height);
        }
    }

    if (target_zoom == 0) {
        target_zoom = 0.85*Math.min(window.innerWidth / layerSize.x, window.innerHeight / layerSize.y)
        target_offset = { x: window.innerWidth/2, y: window.innerHeight/2 }
    }

    let change_offset = {x: 0, y: 0};
    change_offset.x = target_offset.x - cameraOffset.x;
    change_offset.y = target_offset.y - cameraOffset.y;
    let change_zoom = target_zoom - cameraZoom;
    
    let original_zoom = cameraZoom;
    let orig_position = {x: 0, y: 0}
    orig_position.x = cameraOffset.x;
    orig_position.y = cameraOffset.y;

    steps = 0;
    dist = 10*Math.log(Math.max(Math.abs(change_offset.x)+1, Math.abs(change_offset.y)+1))
    zm = 20*Math.max(target_zoom / cameraZoom, cameraZoom / target_zoom);
    console.log("Factors: ")
    console.log(dist)
    console.log(zm);
    totalSteps = parseInt(Math.max(dist, zm));

    //cameraOffset.x += change_offset.x;
    //cameraOffset.y += change_offset.y;
    //_update_position();
    
    let sum = 0;
    let moveEffect = setInterval(function () {
        if (false) {
            cameraOffset.x = target_offset.x
            cameraOffset.y = target_offset.y
            cameraZoom = target_zoom;
            _update_zoom(offset_camera=false)
            _update_position()
            clearInterval(moveEffect)
        }
        if (steps < totalSteps+1) {
            x = 3*(1 - 2*steps/totalSteps)
            f = 0.5-0.5*Math.tanh(x)

            x_p = 0
            f_p = 0
            if (steps > 0) {
                x_p = 3*(1 - 2*(steps-1)/totalSteps)
                f_p = 0.5-0.5*Math.tanh(x_p)
            }
            if (steps == totalSteps) {
                f = 1
            }

            cameraOffset.x += change_offset.x * (f - f_p);
            cameraOffset.y += change_offset.y * (f - f_p);
            cameraZoom += change_zoom * (f - f_p);
            steps++;
            _update_zoom(offset_camera=false)
            _update_position()
        } else {
            console.log("Focus done.")
            clearInterval(moveEffect);
        }
    }, 10);
}

function _add_layers_to_side() {
    let sidebar = document.getElementById('sidebar_layers');
    sidebar.innerHTML = '';

    
    for (let i = 0; i < layer_amount; i++) {
        let div_layer = document.createElement('div');
        div_layer.id = 'layer_element_' + i;
        div_layer.value = i;
        div_layer.classList.add('layer_element');
        div_layer.addEventListener('dblclick', function (event) {
            id = null;
            if (event.target.classList.contains("layer_element")) {
                id = parseInt(event.target.id.replace("layer_element_", ""))
            }
            if (event.target.classList.contains("layer_thumbnail")) {
                id = parseInt(event.target.id.replace("layer_thumbnail_", ""))
            }
            if (event.target.classList.contains("layer_name_div")) {
                id = parseInt(event.target.id.replace("layer_name_div_", ""))
            }
            if (id !== null) {
                _focus_on_layer(id);
            }
        });
        div_layer.addEventListener('click', function (event) {
            // do something
            id = null;
            if (event.target.classList.contains("layer_element")) {
                id = parseInt(event.target.id.replace("layer_element_", ""))
            }
            if (event.target.classList.contains("layer_thumbnail")) {
                id = parseInt(event.target.id.replace("layer_thumbnail_", ""))
            }
            if (event.target.classList.contains("layer_name_div")) {
                id = parseInt(event.target.id.replace("layer_name_div_", ""))
            }
            if (id !== null) {
                console.log("Select layer: "+id)
                deselectLayerSide(selected_layer);
                selectLayerSide(id);
                selected_layer = id;
                //redo_cache = true;
                //requestAnimationFrame( draw )
            }
        });
        sidebar.appendChild(div_layer);

        let checkbox_div = document.createElement('div');
        checkbox_div.classList.add('checkbox_div');
        checkbox_div.id = 'checkbox_div_' + i;
        div_layer.appendChild(checkbox_div);

        let checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.name = "checkbox_"+i;
        checkbox.value = i;
        checkbox.id = "checkbox_"+i;
        checkbox.classList.add('checkbox');
        checkbox.checked = layer_info[i].visible;

        checkbox.addEventListener('change', (event) => {
            for (let i = 0; i < layer_amount; i++) {
                layer_info[i].visible = document.getElementById('checkbox_'+i).checked;
                //console.log(i+": "+layer_info[i].visible)
            }
            redo_cache = true;
            requestAnimationFrame( draw );
          })

        checkbox_div.appendChild(checkbox);


        let layer_thumbnail = document.createElement('div');
        layer_thumbnail.id = 'layer_thumbnail_'+i;
        layer_thumbnail.classList.add('layer_thumbnail');
        layer_thumbnail.style.background = "url("+datapath+"/"+i+"_thumbnail.png)";
        layer_thumbnail.style.backgroundSize = "100% 100%";
        //layer_thumbnail.style.aspectRatio = layer_info[i].x + " / " + layer_info[i].y;
        layer_thumbnail.style.aspectRatio = layerSize.x + " / " + layerSize.y;
        div_layer.appendChild(layer_thumbnail);

        let layer_name_div = document.createElement('div');
        layer_name_div.id = 'layer_name_div_' + i;
        layer_name_div.classList.add('layer_name_div');
        layer_name_div.innerHTML = layer_info[i].name
        //jQuery(layer_name_div).fitText();
        div_layer.appendChild(layer_name_div);

    }
}

function selectLayerSide(layer) {

    if (layer >= 0 && layer <= layer_amount) {

        let layer_side_element = document.getElementById('layer_element_'+layer);
        let layer_thumbail_element = document.getElementById('layer_thumbnail_'+layer);

        let moving_canvas_selection = document.getElementById('moving_canvas_selection');
        moving_canvas_selection.style.background = "url("+datapath+"/"+layer+"_b.png)";
        moving_canvas_selection.style.backgroundSize = "100% 100%";
        moving_canvas_selection.style.aspectRatio = layerSize.x + " / " + layerSize.y;
        
        //let layer_b_element = document.getElementById('layer_b_'+layer);
        //layer_b_element.style.opacity = 1;

        layer_side_element.style.borderColor = "red"
        layer_side_element.style.background = "rgba(0, 0, 0, 0.5)"
        layer_side_element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });

    }

}

function deselectLayerSide(layer) {
    console.log("deselect "+layer);
    if (layer >= 0 && layer <= layer_amount) {
        let layer_element = document.getElementById('layer_element_'+layer);
        let layer_thumbail_element = document.getElementById('layer_thumbnail_'+layer);

        let moving_canvas_selection = document.getElementById('moving_canvas_selection');
        moving_canvas_selection.style.background = "none";
        
        //let layer_b_element = document.getElementById('layer_b_'+layer);
        //layer_b_element.style.opacity = 0;

        layer_element.style.borderColor = "black"
        layer_element.style.background = "rgba(127, 127, 127, 0.5)"
    }
}

function refreshSite() {

    //overwrite changed layer_info values
    for (let i = 0; i < layer_amount; i++) {
        layer_info[i].visible = layer_visibility_copy[i]
    }
    //reset sidebar visibility checkboxes
    for (let i = 0; i < layer_amount; i++) {
        let checkbox = document.getElementById("checkbox_"+i);
        checkbox.checked = layer_info[i].visible;
    }
    //clear selection
    deselectLayerSide(selected_layer);
    selected_layer = -1
    //redraw
    redo_cache = true;
    requestAnimationFrame( draw );
    //reset zoom
    cameraZoom = 0.85*Math.min(window.innerWidth / layerSize.x, window.innerHeight / layerSize.y)
    //reset cameraOffset
    cameraOffset = { x: window.innerWidth/2, y: window.innerHeight/2 }
    _update_zoom()
    _update_zoom()
    console.log("Reset to default.")
}

function hideSidebar() {

    let moveTarget = document.getElementById("sidebar");
    if (parseFloat(moveTarget.style.left) >= 0) {
        let moveEffect = setInterval(function () {
            if (parseFloat(moveTarget.getBoundingClientRect().right) > 0) {
                moveTarget.style.left = (parseFloat(moveTarget.style.left) - 10) + "px"
                let hideSidebarIcon = document.getElementById("hideSidebarIcon");
                let rect = hideSidebarIcon.getBoundingClientRect();
                //console.log(rect.top, rect.right, rect.bottom, rect.left);
                if (rect.left <= 0) {
                    let showSidebarIcon = document.getElementById("showSidebarIcon");
                    showSidebarIcon.style.opacity = 1
                    showSidebarIcon.style.zIndex = 5
                    hideSidebarIcon.style.opacity = 0
                    hideSidebarIcon.style.zIndex = -1
                }
            } else {
                console.log("Sidebar hidden.")
                clearInterval(moveEffect);
            }
        }, 10);
    }

}

function showSidebar() {

    let moveTarget = document.getElementById("sidebar");
    if (parseFloat(moveTarget.getBoundingClientRect().right) <= 0) {
        let moveEffect = setInterval(function () {
            if (parseFloat(moveTarget.getBoundingClientRect().left) < 0) {
                moveTarget.style.left = (parseFloat(moveTarget.style.left) + 10) + "px"
                let hideSidebarIcon = document.getElementById("hideSidebarIcon");
                let rect = hideSidebarIcon.getBoundingClientRect();
                //console.log(rect.top, rect.right, rect.bottom, rect.left);
                if (rect.left >= 0) {
                    let showSidebarIcon = document.getElementById("showSidebarIcon");
                    showSidebarIcon.style.opacity = 0
                    showSidebarIcon.style.zIndex = 1
                    hideSidebarIcon.style.opacity = 1
                    hideSidebarIcon.style.zIndex = 5
                }
            } else {
                console.log("Sidebar shown.")
                clearInterval(moveEffect);
            }
        }, 10);
    }
}

function _display_title() {
    let title = ids[id_selected].replaceAll("%20", " ");
    let project_name = document.getElementById("project_name");
    project_name.innerHTML = title;
    _fade_out("project_name", fade_time=1, delay=5);
}

function _fade_out(target_div_name, fade_time=1.0, delay=0) {
    let fadeTarget = document.getElementById(target_div_name);
    fadeTarget.style.visibility = "visible";
    setTimeout( function() {
        let fadeEffect = setInterval(function () {
            if (!fadeTarget.style.opacity) {
                fadeTarget.style.opacity = 1;
            }
            if (fadeTarget.style.opacity > 0) {
                fadeTarget.style.opacity -= 10/(fade_time*1000);
            } else {
                console.log("Element hidden")
                fadeTarget.style.opacity = 1;
                fadeTarget.style.visibility = "hidden";
                clearInterval(fadeEffect);
            }
        }, 10);
    }, 1000*delay);
}

function load_status(path) {
    return fetch(path+"/status.txt")
      .then(function(response) {
          let tmp = response.text();
          return tmp; });
}
function load_json_metadata(path) {
    return fetch(path+"/info.json")
      .then(function(response) {
          let tmp = response.json();
          return tmp; });
}

  
async function load_image_json(path, id)
{
    await (fetch(path+"/"+id+".json")
  .then(response => response.json())
  .then(json => layer_info[id] = json ));
}

function load_image(path, id)
{
    
    let img = new Image();   // Create new img element
    img.addEventListener('load', function() {
        layers[id] = img;
        //layerSize.x = img.width;
        //layerSize.y = img.height;
        layers_loaded += 1;
        fully_loaded();
    }, false);
    img.src = path + "/" + id + ".png"; // Set source path
    
    /*
    let img2 = new Image();
    img2.addEventListener('load', function() {
        layer_click[id] = img2;
        layer_click_loaded += 1;
        fully_loaded();
    }, false);
    img2.src = path + "/" + id + "_r.png";
    */
    
    let img3 = new Image();
    img3.addEventListener('load', function() {
        layer_border[id] = img3;
        layer_border_loaded += 1;
        fully_loaded();
    }, false);
    img3.src = path + "/" + id + "_b.png";
    
    /*
    let img4 = new Image();
    img4.addEventListener('load', function() {
        layer_area[id] = img4;
        layer_area_loaded += 1;
        fully_loaded();
    }, false);
    img4.src = path + "/" + id + "_a.png";
    */

    let blob = null;
    fetch(path + "/" + id +".blob")
        .then(function(response) {
        let tmp = response.blob();
        return tmp; })
        .then(function (blob)
        {
            let fr = new FileReader();
            fr.onload = function() {
                var data = fr.result;
                var array = new Int8Array(data);
                layer_opacity[id] = array;
                layer_opacity_loaded += 1; 
                fully_loaded();
            }
            fr.readAsArrayBuffer(blob);
        });
}

function fully_loaded() {
    //loading_progress = parseInt( (layers_loaded + layer_click_loaded + layer_border_loaded + layer_area_loaded + layer_opacity_loaded) * 100 / (5 * complete_layer_amount) ) ;
    loading_progress = parseInt( (layers_loaded + layer_border_loaded + layer_opacity_loaded) * 100 / (3 * complete_layer_amount) ) ;
    console.log(loading_progress);
    _OUT.value = parseInt(loading_progress)
    _PRG.value = loading_progress
    if (complete_layer_amount <= layers_loaded &&
        complete_layer_amount <= layer_border_loaded &&
        complete_layer_amount <= layer_opacity_loaded) {
    //if (complete_layer_amount <= layers_loaded && complete_layer_amount <= layer_click_loaded && complete_layer_amount <= layer_border_loaded && complete_layer_amount <= layer_area_loaded) {
     _fully_loaded()   
    } else {
        //requestAnimationFrame( draw ) //for updating the loading bar :S
    }
}


function _fully_loaded() {
    end_time_image_load = performance.now()
    console.log(`Image-Load ${end_time_image_load - start_time_image_load} ms`)
    console.log("Completely loaded!")
    console.log("Fill sidebar.")
    _add_layers_to_side()
    //_create_layers()
    console.log("Sidebar complete.")
    //canvas.offscreenCanvas = document.createElement('canvas');
    //canvas.clickCanvas = document.createElement('canvas');
    //canvas.offscreenCanvas.width = layerSize.x
    //canvas.offscreenCanvas.height = layerSize.y
    //canvas.clickCanvas.width = layerSize.x
    //canvas.clickCanvas.height = layerSize.y
    cameraZoom = Math.min(window.innerWidth / layerSize.x, window.innerHeight / layerSize.y)
    MIN_ZOOM = cameraZoom * 0.5
    MAX_ZOOM = cameraZoom * 5
    cameraZoom *= 0.85
    _update_zoom();
    _update_position();
    
    completely_loaded = true
    redo_cache = true
    redraw_layer = true
    _fade_out("loader", 1, 1);
    redo_cache = true
    redo_canvas = true
    requestAnimationFrame( draw );
    _display_title();
}

function load_images(path)
{
    datapath = path
    load_json_metadata(path).then(function(metadata) {
        layerSize.x = metadata.width
        layerSize.y = metadata.height
        project_metadata = metadata
        console.log("Layer-Size:")
        console.log(layerSize.x)
        console.log(layerSize.y)
    }).then(
        load_status(path).then(function(amount_of_layers) {
            console.log(""+amount_of_layers+" Layer");
            layer_amount = parseInt(amount_of_layers);
            console.log("Load json descriptors...")
            json_promises = [];
            var start_time_json_load = performance.now()
            for (let i = 0; i < layer_amount; i++) {
                json_promises.push(load_image_json(path, i));
            }
            Promise.all(json_promises).then(function() {
                _update_info_container();
                layer_visibility_copy = {};
                for (let i=0; i < layer_amount; i++) {
                    layer_visibility_copy[i] = layer_info[i].visible;
                }
                var end_time_json_load = performance.now()
                start_time_image_load = performance.now()
                console.log(`JSON-Load ${end_time_json_load - start_time_json_load} ms`)
                for (let i = 0; i < layer_amount; i++) {
                    console.log(i+": "+layer_info[i].name);
                }
                
                console.log("Json loaded. Load images...")
                complete_layer_amount = layer_amount
                for (let i = 0; i < layer_amount; i++) {
                    load_image(path, i);
                }
            });
        })
    );
}

/*function _draw_selection(index, context) {
    if (index >= 0 && index < layer_amount) {
        console.log("Draw selection "+index)
        context.globalAlpha = 1.0;
        context.globalCompositeOperation = "color";
        context.drawImage(layer_border[index], 0, 0);
    }
}*/

function _draw_layer(index, context){
    js = layer_info[index]
    if (typeof js !== 'undefined') {
        if (js.visible) {
            
            /*
            click_context.globalCompositeOperation = "source-over";
            click_context.globalAlpha = 1.0;
            click_context.drawImage(layer_click[index], 0, 0);
            
            area_context.globalCompositeOperation = "lighten";
            area_context.globalAlpha = 1.0;
            area_context.drawImage(layer_area[index], 0, 0);
            */
            
            /*if (index == selected_layer) {
                console.log("Draw selection "+selected_layer)
                context.globalAlpha = 1.0;
                context.globalCompositeOperation = "source-over";
                context.drawImage(layer_border[index], 0, 0);
            }*/
            
            context.globalAlpha = js.opacity / 255;
            blendMode = js.blendMode;
            switch(blendMode) {
                case "0": context.globalCompositeOperation = "source-over"; break; //Normal
                case "1": context.globalCompositeOperation = "multiply"; break; //Multiply
                case "2": context.globalCompositeOperation = "lighter"; break; //Additive
                case "3": context.globalCompositeOperation = "color-burn"; break; //ColorBurn !NOT THE SAME!
                case "4": context.globalCompositeOperation = "color-dodge"; break; //ColorDodge !NOT THE SAME!
                case "5": context.globalCompositeOperation = "screen"; break; //Reflect !NOT THE SAME!
                case "6": context.globalCompositeOperation = "lighten"; break; //Glow !NOT THE SAME!
                case "7": context.globalCompositeOperation = "overlay"; break; //Overlay
                case "8": context.globalCompositeOperation = "difference"; break; //Difference
                case "9": context.globalCompositeOperation = "exclusion"; break; //Negation !SOMEWHAT WRONG!
                case "10": context.globalCompositeOperation = "lighten"; break; //Lighten
                case "11": context.globalCompositeOperation = "darken"; break; //Darken
                case "12": context.globalCompositeOperation = "screen"; break; //Screen
                case "13": context.globalCompositeOperation = "exclusion"; break; //XOR !SOMEWHAT WRONG!
            }
            console.log("Draw") 
            context.drawImage(layers[index], 0, 0);
        } else {
            //console.log("Not visible")
        }
    }
}

function draw_layer()
{
    if (typeof canvas !== 'undefined') {
        if (typeof canvas.offscreenCanvas === 'undefined' || canvas.offscreenCanvas == null) {
            //canvas.offscreenCanvas = document.createElement('canvas');
            canvas.offscreenCanvas = document.getElementById("moving_canvas");
            /*canvas.offscreenCanvas = document.createElement('canvas');
            canvas.offscreenCanvas.id = 'moving_canvas';

            document.getElementById('moving_canvas_container').appendChild(canvas.offscreenCanvas);
            console.log("GOT CANVAS")
            console.log(canvas.offscreenCanvas)*/
        }
        if (layerSize.x != canvas.offscreenCanvas.width || layerSize.y != canvas.offscreenCanvas.height) {
            canvas.offscreenCanvas.width = layerSize.x;
            canvas.offscreenCanvas.height = layerSize.y;
            if (offscreenContext != null) {
                //console.log("GLINFO")
                //console.log(offscreenContext)
                //console.log(offscreenContext.viewport_data)
                //offscreenContext.viewport_data = new Float32Array([0, 0, canvas.offscreenCanvas.width, canvas.offscreenCanvas.height]);
                offscreenContext.reset();
                //console.log(offscreenContext.viewport_data)
            }
        }
        /*if (typeof canvas.clickCanvas === 'undefined') {
            canvas.clickCanvas = document.createElement('canvas');
            canvas.clickCanvas.width = layerSize.x
            canvas.clickCanvas.height = layerSize.y
        }
        if (typeof canvas.areaCanvas === 'undefined') {
            canvas.areaCanvas = document.createElement('canvas');
            canvas.areaCanvas.width = layerSize.x
            canvas.areaCanvas.height = layerSize.y
        }*/
        
        if (use_webgl) {
            if (offscreenContext == null) {
                offscreenContext = enableWebGLCanvas( canvas.offscreenCanvas );
                console.log("IMAGE_DATA");
                console.log(offscreenContext.getImageData(0, 0, canvas.offscreenCanvas.width, canvas.offscreenCanvas.height));
            }
            //click_context = enableWebGLCanvas( canvas.clickCanvas );
            //area_context = enableWebGLCanvas( canvas.areaCanvas );
            context = offscreenContext;
        } else {
            //click_context = canvas.clickCanvas.getContext('2d')
            //area_context = canvas.areaCanvas.getContext('2d')
            context = canvas.offscreenCanvas.getContext('2d')
        }

        //Clear canvas
        context.clearRect(0, 0, canvas.offscreenCanvas.width, canvas.offscreenCanvas.height);
        
        if (use_webgl) {
            //click_context.start2D();
            //area_context.start2D();
            context.start2D();
        }

        for (let i = 0; i < layer_amount; i++) {
            //_draw_layer(i, click_context, area_context, context)
            _draw_layer(i, context);
        }

        //console.log(canvas.offscreenCanvas.toDataURL());

        //_draw_selection(selected_layer, context);

        if (use_webgl) {
            //click_context.finish2D();
            //area_context.finish2D();
            context.finish2D();
        }
    
    } else { 
        console.log("Not defined.")
    }
}

function _draw(DOMHighResTimeStamp){
    console.log("Useless draw call")
}

function draw(DOMHighResTimeStamp)
{

    //console.log("Draw call")

    if (!draw_in_progress) {
        draw_in_progress = true
        
        if (redo_cache) {
            redo_canvas = true
            redo_cache = false
            console.log("Draw Layer Cache")
            start_time_draw_layer = performance.now()
            draw_layer()
            end_time_draw_layer = performance.now()
            console.log(`Draw-Layer: ${end_time_draw_layer - start_time_draw_layer} ms`)
        }
        
        if (redo_canvas) {
            /*console.log(DOMHighResTimeStamp);
            console.log("redraw layer");
            
            start_time_draw = performance.now()
            
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight*/

            /*if (use_webgl) {
                ctx.start2D();
            }
            
            // Translate to the canvas centre before zooming - so you'll always zoom on what you're looking directly at
            if (use_webgl) {
                ctx.translate( window.innerWidth / 2, window.innerHeight / 2 )
                if (previousZoom != cameraZoom) {
                    let zoomFactor = cameraZoom / previousZoom
                    console.log("Change zoom by factor "+zoomFactor);
                    ctx.scale(zoomFactor, zoomFactor);
                    previousZoom = cameraZoom
                }
                ctx.translate( -window.innerWidth / 2, -window.innerHeight / 2)
                ctx.translate(cameraOffset.x-previousCameraOffset.x, cameraOffset.y-previousCameraOffset.y )
                previousCameraOffset.x = cameraOffset.x;
                previousCameraOffset.y = cameraOffset.y;
                //ctx.translate( -window.innerWidth / 2 + cameraOffset.x, -window.innerHeight / 2 + cameraOffset.y )
            }else{
                ctx.translate( window.innerWidth / 2, window.innerHeight / 2 )
                ctx.scale(cameraZoom, cameraZoom)
            }
            ctx.clearRect(0,0, window.innerWidth, window.innerHeight)
            
            
            //layers.forEach(draw_layer)
            if (typeof canvas.offscreenCanvas !== 'undefined') {
                if (use_webgl) {
                    ctx.drawImage(canvas.offscreenCanvas, -canvas.offscreenCanvas.width/2, -canvas.offscreenCanvas.height/2);
                    //offscreenContext.start2D();
                    //console.log("C")
                    //let d = offscreenContext.getImageData(0, 0, canvas.offscreenCanvas.width, canvas.offscreenCanvas.height);
                    //console.log(d);
                    //ctx.putImageData(d, 1000, 10000);
                    //offscreenContext.finish2D();
                }else{
                    ctx.drawImage(canvas.offscreenCanvas, -canvas.offscreenCanvas.width/2, -canvas.offscreenCanvas.height/2);
                }


                //console.log(canvas.offscreenCanvas.toDataURL())
                //if (selected_layer>=0 && selected_layer < layers.length) {
                    //context = canvas.offscreenCanvas.getContext('2d')
                //    console.log("Draw selection "+selected_layer)
                //    ctx.globalAlpha = 1.0;
                //    ctx.globalCompositeOperation = "source-over";
                //    ctx.drawImage(layer_border[selected_layer], -canvas.offscreenCanvas.width/2, -canvas.offscreenCanvas.height/2);
                //}
                
                end_time_draw = performance.now()
                console.log(`Draw-Cache on Canvas: ${end_time_draw - start_time_draw} ms`)
                
            } else {
                console.log("offscreen canvas undefined???")
                schedule_draw = true
            }
            
            if (use_webgl) {
                ctx.finish2D();
            }*/
        }

        draw_in_progress = false

        if (schedule_draw) {
            schedule_draw = false
            requestAnimationFrame( draw );
        }
    } else {
        console.log("Schedule redraw")
        schedule_draw = true
    }
}


// Gets the relevant location from a mouse or single touch event
function getEventLocation(e)
{
    if (e.touches && e.touches.length == 1)
    {
        return { x:e.touches[0].clientX, y: e.touches[0].clientY }
    }
    else if (e.clientX && e.clientY)
    {
        return { x: e.clientX, y: e.clientY }        
    }
}

let isDragging = false
let dragStart = { x: 0, y: 0 }
let pointer_moved = false

function onPointerDown(e)
{
    isDragging = true
    //dragStart.x = getEventLocation(e).x/cameraZoom - cameraOffset.x
    //dragStart.y = getEventLocation(e).y/cameraZoom - cameraOffset.y
    dragStart.x = getEventLocation(e).x - cameraOffset.x
    dragStart.y = getEventLocation(e).y - cameraOffset.y
    console.log("X: "+dragStart.x)
    console.log("Y: "+dragStart.y)
    if (completely_loaded) {
        pointer_moved = false
    }
}

function _get_canvas_click_location(event) {
    let result = {x: 0, y: 0}

    let moving_canvas_container = document.getElementById("moving_canvas_container");
    result.x = parseInt((getEventLocation(event).x - cameraOffset.x + 0.5 * parseFloat(moving_canvas_container.style.width)) * layerSize.x / parseFloat(moving_canvas_container.style.width));
    result.y = parseInt((getEventLocation(event).y - cameraOffset.y + 0.5 * parseFloat(moving_canvas_container.style.height)) * layerSize.y / parseFloat(moving_canvas_container.style.height));

    return result;
}

function _get_clicked_layer(x, y) {
    start_time_blob_coords = performance.now();
    let layer = -1;
    for (let i = layer_amount-1; i >= 0; i--) {
        js = layer_info[i]
        if (typeof js !== 'undefined') {
            if (js.visible) {
                //opacity_map[(y+im.height*x)//8] |= (0b1 << (7 - ((y+im.height*x) % 8) ))
                let res = layer_opacity[i][parseInt((y + layerSize.y * x)/8)] & (1 << (7 - ((y + layerSize.y * x)%8)));
                if (res) {
                    layer = i;
                    break;
                }
            }
        }
    }
    end_time_blob_coords = performance.now()
    console.log(`Check image coords via blob ${end_time_blob_coords - start_time_blob_coords} ms`)
    return layer;
}

function _single_click(x, y) {
    if (x >= 0 && y>=0 && x < layerSize.x && y < layerSize.y) {
        let id = _get_clicked_layer(x, y);
        if (selected_layer != id) {
            js = layer_info[id]
            if (id != -1) {
                console.log("switch layer to "+id)
                console.log("Layer Name: "+js.name)
            }
            old_l = selected_layer;
            selected_layer = id;
            deselectLayerSide(old_l);
            selectLayerSide(id);
        }
    }else if (selected_layer != -1) {
        deselectLayerSide(selected_layer);
        selected_layer = -1;
    }
}

function _double_click(x, y){
    if (x >= 0 && y>=0 && x < layerSize.x && y < layerSize.y) {
        let id = _get_clicked_layer(x, y);
        _focus_on_layer(id);
    } else {
        _focus_on_layer(-1);
    }

}

function onPointerUp(e)
{
    isDragging = false
    initialPinchDistance = null
    lastZoom = cameraZoom
    if (pointer_moved == false) {
        if (completely_loaded && layers[0] !== 'undefined') {
            let click_coords = _get_canvas_click_location(e);
            let x = click_coords.x;
            let y = click_coords.y;
            if (is_mobile()){
                if (double_tap_time != null) {
                    if (performance.now() - double_tap_time < 500) {
                        _double_click(x, y);
                    } else {
                        _single_click(x, y);
                    }
                    double_tap_time = null;
                } else {
                    double_tap_time = performance.now();
                    double_tap_time_copy = double_tap_time;
                    setTimeout(function() {
                        if (double_tap_time == double_tap_time_copy) {
                            double_tap_time = null;
                            _single_click(x, y);
                        }
                    }, 500);
                }
            } else {
                _single_click(x, y);
            }
        }
    }
}

function onPointerMove(e)
{
    if (isDragging)
    {
        pointer_moved = true
        
        if (typeof getEventLocation(e) !== 'undefined' && typeof getEventLocation(e).x !== 'undefined' && typeof getEventLocation(e).y !== 'undefined') {
            cameraOffset.x = getEventLocation(e).x - dragStart.x;
            cameraOffset.y = getEventLocation(e).y - dragStart.y;
            //cameraOffset.x = Math.min( cameraOffsetMax.x, Math.max( cameraOffsetMin.x, cameraOffset.x));
            //cameraOffset.y = Math.min( cameraOffsetMax.y, Math.max( cameraOffsetMin.y, cameraOffset.y));
            if (completely_loaded) {
                _update_position();
            }
        } else{
            console.log("Something is undefined:");
            console.log(getEventLocation(e));
        }
    }
}

function handleTouch(e, singleTouchHandler)
{
    if ( e.touches.length == 1 )
    {
        singleTouchHandler(e)
    }
    else if (e.type == "touchmove" && e.touches.length == 2)
    {
        isDragging = false
        handlePinch(e)
    }
}

let initialPinchDistance = null
let lastZoom = cameraZoom

function handlePinch(e)
{
    e.preventDefault()
    
    let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
    
    // This is distance squared, but no need for an expensive sqrt as it's only used in ratio
    let currentDistance = (touch1.x - touch2.x)**2 + (touch1.y - touch2.y)**2
    
    if (initialPinchDistance == null)
    {
        initialPinchDistance = currentDistance
    }
    else
    {
        adjustZoom( null, currentDistance/initialPinchDistance )
    }
}

function adjustZoom(zoomAmount, zoomFactor)
{
    if (!isDragging)
    {
        if (zoomAmount)
        {
            cameraZoom += zoomAmount
        }
        else if (zoomFactor)
        {
            cameraZoom = zoomFactor*lastZoom
        }
        
        cameraZoom = Math.min( cameraZoom, MAX_ZOOM )
        cameraZoom = Math.max( cameraZoom, MIN_ZOOM )
        if (completely_loaded) {

            _update_zoom()
            
            requestAnimationFrame( draw );
        }
        
        //console.log(zoomAmount)
    }
}

function _update_id_counter() {
    let queue = document.getElementById('Queue');
    queue.textContent = (id_selected+1)+' / '+ids.length;
}

function _update_position(){
    let moving_canvas_container = document.getElementById('moving_canvas_container');
    //console.log("Position: "+cameraOffset.x+","+cameraOffset.y)
    moving_canvas_container.style.top = (cameraOffset.y - parseInt(moving_canvas_container.style.height)/2)+"px";
    moving_canvas_container.style.left = (cameraOffset.x - parseInt(moving_canvas_container.style.width)/2)+"px";
}

function _update_zoom(offset_camera=true){
    let moving_canvas_container = document.getElementById('moving_canvas_container');

    //cameraOffsetMin = { x: -layerSize.x *MIN_ZOOM * 0.5, y: -layerSize.y * MIN_ZOOM * 0.5 }
    cameraOffsetMin = {x: 0, y: 0};
    cameraOffsetMax = {x: window.innerWidth, y: window.innerHeight};
    //cameraOffsetMax = { x: window.innerWidth + layerSize.x * MIN_ZOOM * 0.5, y: window.innerHeight + layerSize.y * MIN_ZOOM * 0.5 }
    //cameraOffsetMax = { x: layerSize.x - window.innerWidth/2, y: layerSize.y - window.innerHeight/2 }
    //console.log("ZOOM: "+cameraZoom)
    let previous_width = parseInt(moving_canvas_container.style.width);
    let previous_height = parseInt(moving_canvas_container.style.height);
    moving_canvas_container.style.width = (cameraZoom * layerSize.x)+"px";
    moving_canvas_container.style.height = (cameraZoom * layerSize.y)+"px";
    if (!isNaN(previous_width) && !isNaN(previous_height)) {
        if (offset_camera) {
            cameraOffset.x -= ( (canvas.width*0.5 - cameraOffset.x) / (previous_width * 0.5)) * 0.5 * (parseInt(moving_canvas_container.style.width) - previous_width);
            cameraOffset.y -= ( (canvas.height*0.5 - cameraOffset.y) / (previous_height * 0.5)) * 0.5 * (parseInt(moving_canvas_container.style.height) - previous_height);
            //cameraOffset.x = Math.min(cameraOffsetMax.x, Math.max(cameraOffsetMin.x, cameraOffset.x));
            //cameraOffset.y = Math.min(cameraOffsetMax.y, Math.max(cameraOffsetMin.y, cameraOffset.y));
        }
    }
    _update_position();
}

function resize_window(event) {
    offset_x = canvas.width - window.innerWidth
    offset_y = canvas.height - window.innerHeight
    console.log("window resize")
    console.log(offset_x)
    console.log(offset_y)
    cameraOffset.x -= offset_x / 2
    cameraOffset.y -= offset_y / 2
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    _update_position();
}

function onDoubleClick(event) {
    let click_coords = _get_canvas_click_location(event)
    let x = click_coords.x;
    let y = click_coords.y;

    if (x >= 0 && y>=0 && x < layerSize.x && y < layerSize.y) {
        let id = _get_clicked_layer(x, y);
        _focus_on_layer(id);
    }else {
        _focus_on_layer(-1);
    }
}

function showInfo() {
    let info_div = document.getElementById("info_div");
    info_div.style.visibility = info_div.style.visibility != "visible" ? "visible" : "hidden";
}

function _update_info_container() {
    let info_div = document.getElementById("info_div");
    info_div.innerHTML =    "<a href='javascript:void(0);' class='icon' style='z-index=7' onclick='showInfo()'>"+
                                "<i id='closeInfo' style='font-size:24px; float: right; color: rgb(223, 223, 223);' class='fa fa-window-close-o'>"+
                                "</i>"+
                            "</a>"+
                            "<center style='font-size: 24px; padding-right: 30px;'>"+ids[id_selected].replaceAll("%20", " ")+"</center>"+
                            "</br>"+
                            "<table>"+
                                "<tr>"+
                                "<th></th><th></th>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Project dimensions: "+
                                    "</td>"+
                                    "<td>"+
                                        layerSize.x+"x"+layerSize.y+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Project file size: "+
                                    "</td>"+
                                    "<td>"+
                                        formatBytes(parseInt(project_metadata["pdn_filesize"]), 2)+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Layer amount: "+
                                    "</td>"+
                                    "<td>"+
                                        layer_amount+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Access time: "+
                                    "</td>"+
                                    "<td>"+
                                        formatTime(project_metadata["atime"])+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Modified time: "+
                                    "</td>"+
                                    "<td>"+
                                    formatTime(project_metadata["mtime"])+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Create time:"+
                                    "</td>"+
                                    "<td>"+
                                    formatTime(project_metadata["ctime"])+
                                    "</td>"+
                                "</tr>"+
                                "<tr><td></td><td></td></tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Image file size: "+
                                    "</td>"+
                                    "<td>"+
                                        formatBytes(parseInt(project_metadata["full_filesize"]))+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Download: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"data/"+ids[id_selected]+"/full.png"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-download fa-beat'</i> Here"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Generated: "+
                                    "</td>"+
                                    "<td>"+
                                    formatTime(project_metadata["generated_timestamp"])+
                                    "</td>"+
                                "</tr>"+
                                "<tr><td></td><td></td></tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Script version: "+
                                    "</td>"+
                                    "<td>"+
                                        project_metadata["generated_script_version"]+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Web source: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://github.com/chrisb09/pdnwebview"+"' target='_blanc'>"+
                                        "<i class='fa fa-code'</i> Source code"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Author: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://christian-f-brinkmann.de"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-user'</i> Christian F. Brinkmann"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Script version: "+
                                    "</td>"+
                                    "<td>"+
                                        project_metadata["generated_script_version"]+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Script source: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://gitlab.com/christianbrinkmann/pdnexport"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-gitlab'</i> pdnexport"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "Dependencies: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://github.com/jagenjo/Canvas2DtoWebGL"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-github'</i> Canvas2DtoWebGL"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        ""+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://github.com/jagenjo/litegl.js"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-github'</i> litegl.js"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        ""+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://github.com/toji/gl-matrix"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-github'</i> gl-matrix"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        ""+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"https://fontawesome.com/"+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-font-awesome'</i> Font Awesome"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                                "<tr>"+
                                    "<td>"+
                                        "License: "+
                                    "</td>"+
                                    "<td>"+
                                        "<a href='"+"LICENSE.md "+"' target='_blanc' rel='noopener noreferrer'>"+
                                        "<i class='fa fa-copyright'</i> MIT license"+
                                        "</a>"+
                                    "</td>"+
                                "</tr>"+
                            "</table>";
}

function nextID() {
    last_id = id_selected;
    id_selected = (id_selected+1+ids.length) % ids.length;
    if (id_selected != last_id) {
        _update_id_counter();
        _switch_motive_to(id_selected);
    }
}

function previousID() {
    last_id = id_selected;
    id_selected = (id_selected-1+ids.length) % ids.length;
    if (id_selected != last_id) {
        _update_id_counter();
        _switch_motive_to(id_selected);
    }
}

function _switch_motive_to(id) {
    _reset_canvas();
    load_images("data/"+ids[id])
}

function _reset_canvas() { //useful for cleaning the canvas before switching motives
    cameraOffset = { x: window.innerWidth/2, y: window.innerHeight/2 }
    /*if (offscreenContext != null) {
        console.log("DESTOY")
        offscreenContext.destroy();
        offscreenContext = null;
        canvas.offscreenCanvas = null;
    } else {
        console.log(offscreenContext)
        console.log(offscreenContext == null)
    }*/
    layers_loaded = 0;
    layer_border_loaded = 0;
    layer_opacity_loaded = 0;

    deselectLayerSide(selected_layer);
    selected_layer = -1;
    
    let fadeTarget = document.getElementById("loader");
    fadeTarget.style.opacity = 1;
    fadeTarget.style.zIndex = "2";
}

function init() {
    canvas = document.getElementById("canvas");
    offscreenContext = null;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    _reset_canvas()

    canvas.addEventListener('dblclick', onDoubleClick)

    canvas.addEventListener('mousedown', onPointerDown)
    canvas.addEventListener('touchstart', (e) => handleTouch(e, onPointerDown))
    canvas.addEventListener('mouseup', onPointerUp)
    canvas.addEventListener('touchend',  (e) => handleTouch(e, onPointerUp))
    canvas.addEventListener('mousemove', onPointerMove)
    canvas.addEventListener('touchmove', (e) => handleTouch(e, onPointerMove))
    canvas.addEventListener( 'wheel', (e) => adjustZoom(-e.deltaY*SCROLL_SENSITIVITY))

    window.addEventListener('resize', resize_window, true);

}

init();

const urlParams = new URLSearchParams(window.location.search);
ids = urlParams.getAll('id')
id_selected = 0
console.log("Ids given: ")
console.log(ids);
if (ids.length > 0){
    for (i=0; i <ids.length; i++) {
        ids[i] = ids[i].replaceAll(" ", "%20")
    }
    _update_id_counter();
    load_images("data/"+ids[id_selected]);
} else {
    urlParams.append("id", "testimage");
    alert("No project names via the id parameter given. Please specify an id like this: \n"+
            window.location.origin + window.location.pathname + "?" + urlParams.toString());
}