"""
FloodSight AI — Compound BCE + Dice Loss with NoData Masking
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class DiceLoss(nn.Module):
    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor, valid_mask: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        
        # Apply valid pixel mask to ignore -1 / nodata
        probs = probs * valid_mask
        targets = targets * valid_mask

        intersection = (probs * targets).sum()
        cardinality = probs.sum() + targets.sum()

        dice = (2.0 * intersection + self.smooth) / (cardinality + self.smooth)
        return 1.0 - dice

class CompoundBCEDiceLoss(nn.Module):
    """
    Compound Loss: BCE_WEIGHT * BCE + DICE_WEIGHT * Dice
    Masks out invalid / no-data pixels from backpropagation.
    """
    def __init__(self, bce_weight: float = 0.5, dice_weight: float = 0.5, pos_weight: float = 1.0):
        super().__init__()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight
        self.pos_weight = torch.tensor([pos_weight])
        self.dice = DiceLoss()

    def forward(self, logits: torch.Tensor, targets: torch.Tensor, valid_mask: torch.Tensor) -> torch.Tensor:
        # Binary Cross Entropy with Logits & Valid Mask
        pos_weight = self.pos_weight.to(logits.device)
        bce_raw = F.binary_cross_entropy_with_logits(
            logits, targets, pos_weight=pos_weight, reduction='none'
        )
        bce_masked = (bce_raw * valid_mask).sum() / (valid_mask.sum() + 1e-7)

        # Dice Loss with Valid Mask
        dice_masked = self.dice(logits, targets, valid_mask)

        return self.bce_weight * bce_masked + self.dice_weight * dice_masked
