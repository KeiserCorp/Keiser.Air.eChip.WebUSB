export interface EChipObject {
    machineData: {
        [index: string]: MachineObject;
    };
    rawData: Uint8Array[];
}
export interface MachineObject {
    position: MachinePosition;
    sets: MachineSet[];
}
export interface MachinePosition {
    chest: number | null;
    rom2: number | null;
    rom1: number | null;
    seat: number | null;
}
export interface MachineSet {
    version: string;
    serial: string;
    time: string;
    resistance: number;
    precision: Precision;
    units: ForceUnit;
    repetitions: number;
    peak: number | null;
    work: number | null;
    distance: number | null;
    test: MachineTest | null;
}
export interface MachineTest {
    type: number;
    high: MachineTestResult | null;
    low: MachineTestResult | null;
}
export interface MachineTestResult {
    power: number;
    velocity: number;
    force: number;
    position: number;
}
export declare enum Precision {
    dec = 0,
    int = 1
}
export declare enum ForceUnit {
    lb = 0,
    kg = 1,
    ne = 2,
    er = 3
}
export declare enum TestType {
    power6r = 0,
    a4206r = 1,
    a42010r = 2
}
export declare function EChipParser(data: Uint8Array[]): EChipObject;
export declare function EChipBuilder(machines: {
    [index: string]: MachineObject;
}): Uint8Array[];
