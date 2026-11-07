"""A Cobaya theory provider for frozen, explicitly lensed CLASS spectra."""

from copy import deepcopy

from cobaya.theory import Theory


class FixedClTheory(Theory):
    """Supply precomputed spectra without allowing nuisance parameters to alter them."""

    params = {}
    spectra = None
    # Cobaya requires every theory in the dependency graph to consume a sampled
    # parameter. Calibration is applied by each likelihood, never to these spectra.
    input_params = ["A_planck"]

    def get_can_support_params(self):
        return ["A_planck"]

    def calculate(self, state, want_derived=True, **params_values_dict):
        if self.spectra is None:
            raise ValueError("FixedClTheory requires a spectra dictionary")
        state["Cl"] = self.spectra

    def get_Cl(self, ell_factor=False, units="FIRASmuK2"):
        if not ell_factor:
            raise ValueError("This frozen CLASS input is already D_ell; ell_factor=True is required")
        if units != "FIRASmuK2":
            raise ValueError("This frozen CLASS input is already FIRAS muK^2")
        return deepcopy(self.current_state["Cl"])
