function renderPostBlocks(blocks, container) {
    container.innerHTML = "";

    blocks.forEach(block => {
        let element;

        switch (block.type) {

            case "heading": {
                const level = block.data.level || 2;
                element = document.createElement(`h${level}`);
                element.textContent = block.data.text;
                break;
            }

            case "paragraph": {
                element = document.createElement("p");
                element.textContent = block.data.text;
                break;
            }

            case "image": {
                element = document.createElement("div");
                element.classList.add("post-image");

                const img = document.createElement("img");
                img.src = block.data.url;
                img.alt = block.data.caption || "";

                element.appendChild(img);

                if (block.data.caption) {
                    const caption = document.createElement("span");
                    caption.classList.add("caption");
                    caption.textContent = block.data.caption;
                    element.appendChild(caption);
                }
                break;
            }

            case "list": {
                element = document.createElement(block.data.style === "ordered" ? "ol" : "ul");

                block.data.items.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    element.appendChild(li);
                });
                break;
            }

            case "quote": {
                element = document.createElement("blockquote");
                element.textContent = block.data.text;

                if (block.data.caption) {
                    const cite = document.createElement("cite");
                    cite.textContent = block.data.caption;
                    element.appendChild(cite);
                }
                break;
            }

            default:
                return;
        }

        container.appendChild(element);
    });
}
