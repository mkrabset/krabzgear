import {CubicBezier} from "../geometry/CubicBezier";

export class SvgExporter {
    static exportGearToSvg(
        beziers: CubicBezier[],
        dimensions: any,
        parameters: any,
        filename: string = 'gear.svg'
    ): void {
        const margin = 10;
        const maxRadius = dimensions.outsideRadius;
        const svgSize = (maxRadius + margin) * 2;
        const centerX = 0;
        const centerY = svgSize;

        // Start SVG content
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgSize}mm" height="${svgSize}mm" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
  <!-- Gear Parameters Metadata -->
  <metadata>
    <gear-parameters>
      <numberOfTeeth>${parameters.numberOfTeeth}</numberOfTeeth>
      <module>${parameters.module}</module>
      <pressureAngle>${parameters.pressureAngle}</pressureAngle>
      <addendumCoeff>${parameters.addendumCoeff}</addendumCoeff>
      <dedendumCoeff>${parameters.dedendumCoeff}</dedendumCoeff>
      <rootFilletCoeff>${parameters.rootFilletCoeff}</rootFilletCoeff>
      <profileShift>${parameters.profileShift}</profileShift>
      <backlash>${parameters.backlash}</backlash>
      <shaftDiameter>${parameters.shaftDiameter}</shaftDiameter>
      <createRing>${parameters.createRing}</createRing>
      <numberOfRingTeeth>${parameters.numberOfRingTeeth}</numberOfRingTeeth>
      <pitchDiameter>${dimensions.pitchRadius * 2}</pitchDiameter>
      <outsideDiameter>${dimensions.outsideRadius * 2}</outsideDiameter>
      <rootDiameter>${dimensions.rootRadius * 2}</rootDiameter>
      <baseDiameter>${dimensions.baseRadius * 2}</baseDiameter>
      <generatedDate>${new Date().toISOString()}</generatedDate>
    </gear-parameters>
  </metadata>
  
  <g transform="translate(${centerX}, ${centerY})">`
        beziers.forEach((bezier) => {
            svgContent += ` <path d="`
            bezier.getSegments().forEach((segment, index) => {
                if (index === 0) {
                    svgContent += `M ${segment.c1.x.toFixed(3)} ${segment.c1.y.toFixed(3)} `;
                }
                svgContent += `C ${segment.c2.x.toFixed(3)} ${segment.c2.y.toFixed(3)} ${segment.c3.x.toFixed(3)} ${segment.c3.y.toFixed(3)} ${segment.c4.x.toFixed(3)} ${segment.c4.y.toFixed(3)} `;
            });
            svgContent += `Z" fill="#f0f0f0" stroke="#333" stroke-width="0.1"/>`;
        })

        // Add shaft hole if specified
        if (dimensions.shaftDiameter && dimensions.shaftDiameter > 0) {
            const shaftRadius = dimensions.shaftDiameter / 2;
            svgContent += `
    <circle cx="0" cy="0" r="${shaftRadius.toFixed(3)}" fill="#ffffff" stroke="#333" stroke-width="0.1"/>`;
        }

        svgContent += `
  </g>
</svg>`;

        // Create and download the file
        const blob = new Blob([svgContent], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static importParametersFromSvg(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const svgContent = e.target?.result as string;
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

                    const gearParams = svgDoc.querySelector('gear-parameters');
                    if (!gearParams) {
                        reject(new Error('No gear parameters found in SVG file'));
                        return;
                    }

                    const parameters = {
                        numberOfTeeth: parseInt(gearParams.querySelector('numberOfTeeth')?.textContent || '0'),

                        module: parseFloat(gearParams.querySelector('module')?.textContent || '0'),
                        pressureAngle: parseFloat(gearParams.querySelector('pressureAngle')?.textContent || '0'),
                        addendumCoeff: parseFloat(gearParams.querySelector('addendumCoeff')?.textContent || '0'),
                        dedendumCoeff: parseFloat(gearParams.querySelector('dedendumCoeff')?.textContent || '0'),
                        backlash: parseFloat(gearParams.querySelector('backlash')?.textContent || '0'),
                        shaftDiameter: parseFloat(gearParams.querySelector('shaftDiameter')?.textContent || '0'),
                        createRing: gearParams.querySelector('createRing')?.textContent==='true' || false,
                        numberOfRingTeeth: parseInt(gearParams.querySelector('numberOfRingTeeth')?.textContent || '0'),
                    };
                    resolve(parameters);
                } catch (error) {
                    reject(new Error('Failed to parse SVG file: ' + error));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}
