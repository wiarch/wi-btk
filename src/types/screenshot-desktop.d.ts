declare module 'screenshot-desktop' {
  type ScreenshotOptions = {
    format?: 'png' | 'jpg';
    screen?: number;
  };

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  export default screenshot;
}
