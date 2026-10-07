using System;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;

class Ocr {
    static void Main(string[] args) {
        if (args.Length < 1) { Console.Error.WriteLine("usage: ocr.exe <image>"); return; }
        RunAsync(args[0]).GetAwaiter().GetResult();
    }

    static async Task RunAsync(string path) {
        var file = await StorageFile.GetFileFromPathAsync(path);
        using (var stream = await file.OpenAsync(FileAccessMode.Read)) {
            var decoder = await BitmapDecoder.CreateAsync(stream);
            var bitmap = await decoder.GetSoftwareBitmapAsync();
            var engine = OcrEngine.TryCreateFromUserProfileLanguages();
            if (engine == null) { Console.Error.WriteLine("no OCR engine"); return; }
            var result = await engine.RecognizeAsync(bitmap);
            Console.WriteLine(result.Text);
        }
    }
}
