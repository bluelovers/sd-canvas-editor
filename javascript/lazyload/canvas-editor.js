console.log('[3D Model Loader] loading...');

async function _import() {
    if (!globalThis.canvasEditor || !globalThis.canvasEditor.import) {
        return await import('polotno');
    } else {
        return await globalThis.canvasEditor.imports.polotno();
    }
}

await _import();

(async function () {
    const container = gradioApp().querySelector('#canvas-editor-container');

    const parent = container.parentNode;
    parent.classList.remove("prose");

    const apiKey = gradioApp().querySelector('#canvas-editor-polotno-api-key');
    const apiKeyValue = apiKey.value;

    const { store } = createPolotnoApp({
        // this is a demo key just for that project
        // (!) please don't use it in your projects
        // to create your own API key please go here: https://polotno.com/cabinet
        key: apiKeyValue,
        // you can hide back-link on a paid license
        // but it will be good if you can keep it for Polotno project support
        showCredit: true,
        container: container,
      });
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);

        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], filename, {type:mime});
    }

    window.sendImageCanvasEditor = async function (type) {
        const imageDataURL = await store.toDataURL();

        var file = dataURLtoFile(imageDataURL, 'my-image-file.jpg');

        const dt = new DataTransfer();
        dt.items.add(file);

        const selector = type === "img2img_img2img" ? "#img2img_image" : "#img2maskimg";

        if (type === "img2img_img2img") {
            switch_to_img2img();
        } else if (type === "img2img_inpaint") {
            switch_to_inpaint();
        }

        let container = gradioApp().querySelector(selector);

        const imageElems = container.querySelectorAll('div[data-testid="image"]')

        updateGradioImage(imageElems[0], dt);
    }

    function getCanvasEditorTabIndex(){
        const tabCanvasEditorDiv = document.getElementById('tab_canvas_editor');
        const parent = tabCanvasEditorDiv.parentNode;
        const siblings = parent.childNodes;

        let index = -1;
        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i] === tabCanvasEditorDiv) {
            index = i;
            break;
          }
        }

        return index / 3;
    }

    function isTxt2Img() {
        const div = document.getElementById('tab_txt2img');
        const computedStyle = window.getComputedStyle(div);
        const displayValue = computedStyle.getPropertyValue('display');

        return !(displayValue === 'none');
    }

    window.sendImageToCanvasEditor = function () {
        const gallerySelector = isTxt2Img()? '#txt2img_gallery': '#img2img_gallery';

        const txt2imgGallery = gradioApp().querySelector(gallerySelector);

        const img = txt2imgGallery.querySelector(".preview img");

        if (img) {
            const tabIndex = getCanvasEditorTabIndex();

            const width = img.naturalWidth; // 获取图片的原始宽度
            const height = img.naturalHeight;

            gradioApp().querySelector('#tabs').querySelectorAll('button')[tabIndex - 1].click();

            store.activePage?.addElement({
                type: 'image',
                src: img.src,
                width: width,
                height: height,
                selectable: true,
                alwaysOnTop: false,
                showInExport: true,
                draggable: true,
                contentEditable: true,
                removable: true,
                resizable: true,
            });
        }
        else {
            alert("No image selected");
        }
    }

    window.sendImageCanvasEditorControlNet = async function (type, index) {
        const imageDataURL = await store.toDataURL();

        var file = dataURLtoFile(imageDataURL, 'my-image-file.jpg');

        const dt = new DataTransfer();
        dt.items.add(file);

        const selector = type === "txt2img" ? "#txt2img_script_container" : "#img2img_script_container";

        if (type === "txt2img") {
            switch_to_txt2img();
        } else if (type === "img2img") {
            switch_to_img2img();
        }

        let container = gradioApp().querySelector(selector);

        let element = container.querySelector('#controlnet');

        if (!element) {
            for (const spans of container.querySelectorAll < HTMLSpanElement > (
                '.cursor-pointer > span'
            )) {
                if (!spans.textContent?.includes('ControlNet')) {
                    continue
                }
                if (spans.textContent?.includes('M2M')) {
                    continue
                }
                element = spans.parentElement?.parentElement
            }
            if (!element) {
                console.error('ControlNet element not found')
                return
            }
        }

        const imageElems = element.querySelectorAll('div[data-testid="image"]')

        if (!imageElems[Number(index)]) {
            let accordion = element.querySelector('.icon');

            if (accordion) {
                accordion.click();

                let controlNetAppeared = false;

                let observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                            for (let i = 0; i < mutation.addedNodes.length; i++) {
                                if (mutation.addedNodes[i].tagName === "INPUT") {

                                    controlNetAppeared = true;

                                    const imageElems2 = element.querySelectorAll('div[data-testid="image"]');

                                    updateGradioImage(imageElems2[Number(index)], dt);

                                    observer.disconnect();

                                    return;
                                }
                            }
                        }
                    });
                });

                observer.observe(element, {childList: true, subtree: true});
            }
        } else {
            updateGradioImage(imageElems[Number(index)], dt);
        }

    };

    function updateGradioImage (element, dt) {
        let clearButton = element.querySelector("button[aria-label='Clear']");

        if (clearButton) {
            clearButton.click();
        }

        const input = element.querySelector("input[type='file']");
        input.value = ''
        input.files = dt.files
        input.dispatchEvent(
            new Event('change', {
                bubbles: true,
                composed: true,
            })
        )
    }
})();