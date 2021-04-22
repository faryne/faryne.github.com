function replaceImages (sourceImages)
{
    let elements = document.getElementsByTagName('img');
    for (let i in elements)
    {
        if (elements[i].width < elements[i].height)
        {
            let l = sourceImages.high.length - 1;
            elements[i].src = sourceImages.high[Math.floor(Math.random() * l )];
        } else {
            let l = sourceImages.wide.length - 1;
            elements[i].src = sourceImages.wide[Math.floor(Math.random() * l )];
        }
    }
}


async function getSourceImages () {
    return await fetch("https://faryne.dev/api/opendata/dmm/video?tag=%E3%83%A1%E3%82%A4%E3%83%89").then(function(obj){
        return obj.json();
    }).then(function(obj){
        let tmp = {
            wide: [],
            high: []
        }
        for (let i in obj.rows) {
            tmp.high.push(obj.rows[i].thumb);
            for (let j in obj.rows[i].images) {
                tmp.wide.push(obj.rows[i].images[j].thumb);
            }
        }
        return tmp;
    });
}
window.onload = async function()
{
    let sourceImages = await getSourceImages();
    replaceImages(sourceImages);
};
