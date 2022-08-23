importScripts('lib/Canvas2DtoWebGL/src/gl-matrix-min.js');
importScripts('lib/Canvas2DtoWebGL/src/litegl.js');
importScripts('lib/Canvas2DtoWebGL/src/Canvas2DtoWebGL.js');

let use_webgl = true;

let canvas = null;
let context = null;

let draw_in_progress = false;
let schedule_draw = false;

let datapath = null;
let layer_amount = 0;
let layer_info = null;
let layers = null;
let layer_size = {x: 0, y: 0};

let layers_loaded = 0;

let initialized = false;

self.onmessage = handle_message_from_main;

function handle_message_from_main(msg) {

    console.log("message from main received in worker:", msg);

    data = msg.data;
    if (data["id"] == "test") {
        console.log("Received test-message, respond with okay.")
        self.postMessage({id: "okay"});
    }else if (data["id"] == "load") {
        init();
        layers = [];
        console.log("Received load request.");
        datapath = data["datapath"];
        layer_amount = data["layer_amount"];
        layer_info = data["layer_info"];
        layer_size = data["layer_size"];
        for (let i=0;i<layer_amount;i++) {
            load_image(datapath, i);
        }
        console.log("Loaded metadata");
        set_canvas_dimensions();
    } else if (data["id"] == "load_image") {
        console.log("Received layer "+data["i"])
        /*let blob = data["image"];
        console.log(blob);
        let bm = await createImageBitmap(blob);
        layers[data["i"]] = bm;*/
        layers_loaded += 1;
        self.postMessage({id: "loading_progress", value: layers_loaded});
    } else if (data["id"] == "render") {
        console.log("Received render instruction.")
        let imagedata = draw_canvas();
        //p = canvas.convertToBlob();
        //Promise.resolve(p).then(function (p) {
        //    console.log(p);
        //})
        console.log(imagedata);
        self.postMessage({id: "render_result", buffer: imagedata.data.buffer, width: imagedata.width, height: imagedata.height}, [imagedata.data.buffer]); //should allow for zero copy
    }

  
  /*const bufTransferredFromMain = msg.data;

  console.log(
    "buf.byteLength in worker BEFORE transfer back to main:",
    bufTransferredFromMain.byteLength
  );

  // send buf back to main and transfer the underlying ArrayBuffer
  self.postMessage(bufTransferredFromMain, [bufTransferredFromMain]);

  console.log(
    "buf.byteLength in worker AFTER transfer back to main:",
    bufTransferredFromMain.byteLength
  );*/
};

function init() {
    if (initialized){
        return;
    }
    initialized = true;
    //canvas = document.createElement('canvas');
    canvas = new OffscreenCanvas(100, 100);
    canvas.id = "offscreenCanvas";
    canvas.width = 100;
    canvas.height = 100;
    if (use_webgl) {
        if (context == null) {
            context = enableWebGLCanvas( canvas );
        }
    } else {
        context = canvas.getContext('2d')
    }
}

function set_canvas_dimensions() {
    canvas.width = layer_size.x;
    canvas.height = layer_size.y;
    if (context != null) {
        context.reset();
    }
}


function load_image(path, id)
{
    /*let img = new Image();   // Create new img element
    img.addEventListener('load', function() {
        layers[id] = img;
        layers_loaded += 1;
        self.postMessage({id: "loading_progress", value: layers_loaded});
    }, false);
    img.src = path + "/" + id + ".png"; // Set source path
    */
    fetch(path + "/" + id + ".png")
            .then(function (r) {
                console.log(r);
                return r.blob();
            })
            .then(function (imgblob) {
                console.log(imgblob)
            createImageBitmap(imgblob).then(function (bitmap) {
                console.log("Loaded "+id);
                layers[id] = bitmap;
                layers_loaded += 1;
                self.postMessage({id: "loading_progress", value: layers_loaded});
            })
        }
    );
}

function draw_canvas()
{
    if (!draw_in_progress) {
        draw_in_progress = true;
        
        console.log("Draw Layer Cache");
        start_time_draw_layer = performance.now();
        let imagedata = draw_layer();
        end_time_draw_layer = performance.now();
        console.log(`Draw-Layer: ${end_time_draw_layer - start_time_draw_layer} ms`);
        
        draw_in_progress = false;

        return imagedata;

        //if (schedule_draw) {
        //    schedule_draw = false;
        //    draw_canvas();
        //}
    } else {
        console.log("Schedule redraw");
        schedule_draw = true;
    }
}

function _draw_layer(index, context){
    js = layer_info[index];
    if (typeof js !== 'undefined') {
        if (js.visible) {
            
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
            self.postMessage({id: "render_progress", value: index+1});
            context.drawImage(layers[index], 0, 0);
        }
    }
}

function draw_layer()
{
    if (typeof canvas !== 'undefined') {

        if (use_webgl) {
            context.start2D();
        }
        //Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < layer_amount; i++) {
            _draw_layer(i, context);
        }
        let imagedata = context.getImageData(0, 0, canvas.width, canvas.height);
        if (use_webgl) {
            context.finish2D();
        }
        console.log(imagedata);
        return imagedata;
    
    } else { 
        console.log("Not defined.")
    }
}